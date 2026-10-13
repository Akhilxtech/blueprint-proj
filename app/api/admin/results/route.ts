
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getLeaderboard } from "@/lib/leaderboard";


export async function GET() {
  try {
    await requireAdmin();

    const [leaderboard, teams, slots, responses] = await Promise.all([
      getLeaderboard(),

      prisma.team.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          quizStatus: true,
          warningCount: true,
          participants: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, email: true },
          },
        },
      }),

      prisma.quizRunQuestion.findMany({
        where: { runId: "main" },
        orderBy: { position: "asc" },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              type: true,
              marks: true,
              options: {
                orderBy: { label: "asc" },
                select: {
                  id: true,
                  label: true,
                  content: true,
                  isCorrect: true,
                },
              },
            },
          },
        },
      }),

      prisma.$queryRaw<
        {
          id: string;
          teamId: string;
          questionId: string;
          optionId: string;
          answeredAt: Date;
          responseMs: number;
          optionLabel: string;
          optionContent: string;
          isCorrect: boolean;
        }[]
      >`
        SELECT
          r."id",
          r."teamId",
          r."questionId",
          r."optionId",
          r."answeredAt",
          r."responseMs",
          o."label" AS "optionLabel",
          o."content" AS "optionContent",
          o."isCorrect"
        FROM "responses" r
        JOIN "question_options" o
          ON o."id" = r."optionId"
         AND o."questionId" = r."questionId"
        JOIN "quiz_roster" roster
          ON roster."teamId" = r."teamId"
        JOIN "quiz_run_questions" qr
          ON qr."runId" = 'main'
         AND qr."questionId" = r."questionId"
        ORDER BY qr."position" ASC, r."answeredAt" ASC
      `,
    ]);

    const safeLeaderboard = leaderboard.map((entry) => ({
      ...entry,
      totalCorrectMs: Number(entry.totalCorrectMs),
    }));

    const safeSlots = slots.map((slot) => ({
      position: slot.position,
      questionId: slot.question.id,
      text: slot.question.text,
      type: slot.question.type,
      marks: slot.question.marks,
      durationMs: slot.durationMs,
      gapMs: slot.gapMs,
      options: slot.question.options,
    }));

    return NextResponse.json(
      {
        leaderboard: safeLeaderboard,
        teams,
        slots: safeSlots,
        responses: responses.map((response) => ({
          ...response,
          responseMs: Number(response.responseMs),
          answeredAt: response.answeredAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin results error:", error);

    return NextResponse.json(
      { error: "Could not load quiz results." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
