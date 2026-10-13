
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";



export async function GET() {
  try {
    await requireAdmin();
        // Persist natural completion before building the snapshot.
    // The conditional update prevents overwriting a concurrent state change.
    
    // Persist natural completion before building the snapshot.
    // Reconcile the database status whenever the timeline has ended.
    const run = await prisma.quizRun.findUnique({
      where: { id: "main" },
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (run?.status === "RUNNING") {
      const clock = computeClock(
        {
          status: run.status,
          startedAt: run.startedAt,
          pausedAt: run.pausedAt,
          pausedMs: run.pausedMs,
          skipMs: run.skipMs,
        },
        run.questions,
        Date.now(),
      );

      if (clock.phase === "ENDED") {
        const endedAt = new Date();

        await prisma.quizRun.updateMany({
          where: {
            id: "main",
            status: "RUNNING",
            startedAt: run.startedAt,
            pausedAt: null,
            pausedMs: run.pausedMs,
            skipMs: run.skipMs,
          },
          data: {
            status: "ENDED",
            endedAt,
            pausedAt: null,
          },
        });
      }
    }

    // One database query supplies the complete admin snapshot.


    // One database query supplies the complete admin snapshot.
    const rows = await prisma.$queryRaw<
      { snapshot: unknown }[]
    >`
     
WITH main_run AS (
  SELECT jsonb_build_object(
    'id', r."id",
    'status', r."status",
    'startedAt',
      CASE
        WHEN r."startedAt" IS NULL THEN NULL
        ELSE to_char(
          r."startedAt",
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        )
      END,
    'pausedAt',
      CASE
        WHEN r."pausedAt" IS NULL THEN NULL
        ELSE to_char(
          r."pausedAt",
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        )
      END,
    'pausedMs', r."pausedMs",
    'skipMs', r."skipMs",
    'endedAt',
      CASE
        WHEN r."endedAt" IS NULL THEN NULL
        ELSE to_char(
          r."endedAt",
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        )
      END
  ) AS data
  FROM "quiz_runs" r
  WHERE r."id" = 'main'
),

      run_slots AS (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'position', qr."position",
              'questionId', q."id",
              'text', q."text",
              'type', q."type",
              'marks', q."marks",
              'durationMs', qr."durationMs",
              'gapMs', qr."gapMs",
              'options', COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', qo."id",
                      'label', qo."label",
                      'content', qo."content",
                      'isCorrect', qo."isCorrect"
                    )
                    ORDER BY qo."label"
                  )
                  FROM "question_options" qo
                  WHERE qo."questionId" = q."id"
                ),
                '[]'::jsonb
              )
            )
            ORDER BY qr."position"
          ),
          '[]'::jsonb
        ) AS data
        FROM "quiz_run_questions" qr
        JOIN "questions" q
          ON q."id" = qr."questionId"
        WHERE qr."runId" = 'main'
      ),
      team_rows AS (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', t."id",
              'name', t."name",
              'quizStatus', t."quizStatus",
              'warningCount', t."warningCount",
              'eliminatedAt', t."eliminatedAt",
              'rulesAcceptedAt', t."rulesAcceptedAt",
              'lastSeenAt', t."lastSeenAt",
              'ready',
                (
                  t."rulesAcceptedAt" IS NOT NULL
                  AND t."lastSeenAt" >=
                    NOW() - INTERVAL '30 seconds'
                  AND t."quizStatus" = 'ACTIVE'
                ),
              'onRoster',
                EXISTS (
                  SELECT 1
                  FROM "quiz_roster" roster
                  WHERE roster."teamId" = t."id"
                ),
              'members', COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', p."id",
                      'name', p."name",
                      'email', p."email"
                    )
                    ORDER BY p."name"
                  )
                  FROM "participants" p
                  WHERE p."teamId" = t."id"
                ),
                '[]'::jsonb
              )
            )
            ORDER BY t."name"
          ),
          '[]'::jsonb
        ) AS data
        FROM "teams" t
      ),
      response_rows AS (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', r."id",
              'teamId', r."teamId",
              'questionId', r."questionId",
              'optionId', r."optionId",
              'answeredAt', r."answeredAt",
              'responseMs', r."responseMs",
              'optionLabel', qo."label",
              'optionContent', qo."content",
              'isCorrect', qo."isCorrect"
            )
          ),
          '[]'::jsonb
        ) AS data
        FROM "responses" r
        JOIN "question_options" qo
          ON qo."id" = r."optionId"
         AND qo."questionId" = r."questionId"
        WHERE EXISTS (
          SELECT 1
          FROM "quiz_run_questions" qr
          WHERE qr."runId" = 'main'
            AND qr."questionId" = r."questionId"
        )
      )
      SELECT jsonb_build_object(
        'serverNow', NOW(),
        'run', (SELECT data FROM main_run),
        'slots', (SELECT data FROM run_slots),
        'teams', (SELECT data FROM team_rows),
        'responses', (SELECT data FROM response_rows),
        'maxWarnings', COALESCE(
          (
            SELECT (s."value" #>> '{}')::int
            FROM "settings" s
            WHERE s."key" = 'maxWarnings'
          ),
          3
        )
      ) AS snapshot
    `;

    const raw = rows[0]?.snapshot;

    if (!raw || typeof raw !== "object") {
      throw new Error("The admin snapshot could not be loaded.");
    }

    const data = raw as {
      serverNow: string;
      run: {
        id: string;
        status: "NOT_STARTED" | "RUNNING" | "PAUSED" | "ENDED";
        startedAt: string | null;
        pausedAt: string | null;
        pausedMs: number;
        skipMs: number;
        endedAt: string | null;
      } | null;
      slots: Array<{
        position: number;
        questionId: string;
        text: string;
        type: string;
        marks: number;
        durationMs: number;
        gapMs: number;
        options: Array<{
          id: string;
          label: string;
          content: string;
          isCorrect: boolean;
        }>;
      }>;
      teams: Array<{
        id: string;
        name: string;
        quizStatus: "ACTIVE" | "ELIMINATED";
        warningCount: number;
        eliminatedAt: string | null;
        rulesAcceptedAt: string | null;
        lastSeenAt: string | null;
        ready: boolean;
        onRoster: boolean;
        members: Array<{
          id: string;
          name: string;
          email: string;
        }>;
      }>;
      responses: Array<{
        id: string;
        teamId: string;
        questionId: string;
        optionId: string;
        answeredAt: string;
        responseMs: number;
        optionLabel: string;
        optionContent: string;
        isCorrect: boolean;
      }>;
      maxWarnings: number;
    };

    const serverNow = Date.now();

    const clock = computeClock(
      data.run
        ? {
            status: data.run.status,
            startedAt: data.run.startedAt,
            pausedAt: data.run.pausedAt,
            pausedMs: data.run.pausedMs,
            skipMs: data.run.skipMs,
          }
        : {
            status: "NOT_STARTED",
            startedAt: null,
            pausedMs: 0,
            skipMs: 0,
          },
      data.slots,
      serverNow,
    );

    const currentSlot =
      clock.index >= 0
        ? data.slots[clock.index] ?? null
        : null;

    const currentQuestionId =
  clock.index >= 0
    ? currentSlot?.questionId ?? null
    : null;

    const currentAnswers = currentQuestionId
      ? data.responses.filter(
          (response) =>
            response.questionId === currentQuestionId,
        )
      : [];

    const optionDistribution = (
      currentSlot?.options ?? []
    ).map((option) => ({
      optionId: option.id,
      label: option.label,
      count: currentAnswers.filter(
        (answer) => answer.optionId === option.id,
      ).length,
    }));

    const teamStats = data.teams.map((team) => {
      const teamAnswers = data.responses.filter(
        (response) => response.teamId === team.id,
      );

      const correctAnswers = teamAnswers.filter(
        (answer) => answer.isCorrect,
      );

      return {
        ...team,
        totalAnswered: teamAnswers.length,
        correctSoFar: correctAnswers.length,
        totalCorrectMs: correctAnswers.reduce(
          (total, answer) => total + answer.responseMs,
          0,
        ),
        answeredCurrentQuestion: currentQuestionId
          ? teamAnswers.some(
              (answer) =>
                answer.questionId === currentQuestionId,
            )
          : false,
      };
    });

    return NextResponse.json(
      {
        serverNow,
        run: data.run,
        phase: clock.phase,
        clock,
        totalQuestions: data.slots.length,
        currentQuestion: currentSlot
          ? {
              id: currentSlot.questionId,
              position: currentSlot.position,
              text: currentSlot.text,
              type: currentSlot.type,
              marks: currentSlot.marks,
              durationMs: currentSlot.durationMs,
              gapMs: currentSlot.gapMs,
            }
          : null,
        answerStats: {
          answered: currentAnswers.length,
          eligibleTeams: data.teams.filter(
            (team) => team.onRoster,
          ).length,
          distribution: optionDistribution,
        },
        teamsReady: teamStats.filter(
          (team) => team.ready,
        ).length,
        teamsOnRoster: teamStats.filter(
          (team) => team.onRoster,
        ).length,
        eliminatedTeams: teamStats.filter(
          (team) => team.quizStatus === "ELIMINATED",
        ).length,
        maxWarnings: data.maxWarnings,
        teams: teamStats,
        responses: data.responses,
        slots: data.slots,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Admin snapshot error:", error);

    return NextResponse.json(
      { error: "Failed to load the admin snapshot." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
