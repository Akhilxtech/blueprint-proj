
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";

export async function GET() {
  await requireAdmin();

  let run = await prisma.quizRun.findUnique({
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
      await prisma.quizRun.updateMany({
        where: { id: "main", status: "RUNNING" },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });

      // Re-read in case another request changed the run concurrently.
      run = await prisma.quizRun.findUnique({
        where: { id: "main" },
        include: {
          questions: {
            orderBy: { position: "asc" },
          },
        },
      });
    }
  }

  return NextResponse.json(
    {
      run: run
        ? {
            id: run.id,
            status: run.status,
            startedAt: run.startedAt,
            pausedAt: run.pausedAt,
            pausedMs: run.pausedMs,
            skipMs: run.skipMs,
            endedAt: run.endedAt,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
