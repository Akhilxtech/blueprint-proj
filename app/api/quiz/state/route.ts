import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const { team } = await requireParticipant();
  const serverNow = new Date();

  const run = await prisma.quizRun.findUnique({
    where: { id: "main" },
    include: {
      questions: {
        orderBy: { position: "asc" },
      },
    },
  });

  const settings = await getSettings();

  // Keep lastSeenAt current before the quiz starts.
  if (!run || run.status === "NOT_STARTED") {
    await prisma.team.update({
      where: { id: team.id },
      data: { lastSeenAt: serverNow },
    });
  }

  const clock = run
    ? computeClock(
        {
          status: run.status,
          startedAt: run.startedAt,
          pausedAt: run.pausedAt,
          pausedMs: run.pausedMs,
          skipMs: run.skipMs,
        },
        run.questions,
        serverNow.getTime(),
      )
    : {
        phase: "NOT_STARTED" as const,
        index: -1,
        questionStartAtMs: null,
        questionEndAtMs: null,
        remainingMs: 0,
        msUntilStart: 0,
      };

  const rosterEntry = await prisma.quizRoster.findUnique({
    where: { teamId: team.id },
    select: { teamId: true },
  });

  const currentSlot =
    clock.index >= 0 ? run?.questions[clock.index] : undefined;

  // Duration of the currently active question, in milliseconds.
  const questionDurationMs =
  currentSlot && clock.questionStartAtMs !== null
    ? Math.max(
        0,
        clock.questionEndAtMs! - clock.questionStartAtMs,
      )
    : 0;
  const currentQuestionId =
    clock.phase === "QUESTION" || clock.phase === "GAP"
      ? currentSlot?.questionId ?? null
      : null;

  // A verdict becomes available only after the next question is active,
  // or after the quiz has ended.
  const previousSlot =
    clock.index > 0 ? run?.questions[clock.index - 1] : undefined;
const canRevealPrevious =
  clock.phase === "GAP" ||
  clock.phase === "QUESTION" ||
  clock.phase === "ENDED";

  const verdictQuestionId = canRevealPrevious
    ? clock.phase === "ENDED"
      ? run?.questions.at(-1)?.questionId
      : previousSlot?.questionId
    : undefined;

  const [lockedResponse, verdictResponse] = await Promise.all([
    currentQuestionId
      ? prisma.response.findUnique({
          where: {
            teamId_questionId: {
              teamId: team.id,
              questionId: currentQuestionId,
            },
          },
          select: { optionId: true },
        })
      : null,

    verdictQuestionId
      ? prisma.response.findUnique({
          where: {
            teamId_questionId: {
              teamId: team.id,
              questionId: verdictQuestionId,
            },
          },
          select: {
            optionId: true,
            question: {
              select: {
                options: {
                  select: {
                    id: true,
                    isCorrect: true,
                  },
                },
              },
            },
          },
        })
      : null,
  ]);

  const verdict = verdictResponse
    ? {
        questionId: verdictQuestionId!,
        selectedOptionId: verdictResponse.optionId,
        isCorrect:
          verdictResponse.question.options.find(
            (option) => option.id === verdictResponse.optionId,
          )?.isCorrect ?? false,
      }
    : null;

    const responseServerNow = Date.now();

  return NextResponse.json({
    serverNow: serverNow.toISOString(),
      runStartedAt: run?.startedAt?.toISOString() ?? null,
    phase: clock.phase,
    index: clock.index,
    total: run?.questions.length ?? 0,
    questionId: currentQuestionId,
    questionEndsAtMs: clock.questionEndAtMs,
    msUntilStart: clock.msUntilStart,
    remainingMs: clock.remainingMs,
    questionDurationMs,
    responseServerNow,

    team: {
      id: team.id,
      name: team.name,
      onRoster: Boolean(rosterEntry),
      quizStatus: team.quizStatus,
      warningCount: team.warningCount,
      maxWarnings: settings.maxWarnings,
    },

    lockedOptionId: lockedResponse?.optionId ?? null,
    verdict,
  });
}