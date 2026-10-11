
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  await requireAdmin();

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.quizRun.findUnique({
      where: { id: "main" },
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!run) {
      return { error: "No quiz run exists.", status: 404 };
    }

    if (run.status !== "RUNNING" && run.status !== "PAUSED") {
      return {
        error: "Only a running or paused quiz can skip a question.",
        status: 409,
      };
    }

    if (!run.startedAt || run.questions.length === 0) {
      return { error: "The quiz has no active question timeline.", status: 409 };
    }

    const clock = computeClock(
      {
        status: run.status,
        startedAt: run.startedAt,
        pausedAt: run.pausedAt,
        pausedMs: run.pausedMs,
        skipMs: run.skipMs,
      },
      run.questions,
      now.getTime(),
    );

    if (
      clock.phase !== "QUESTION" &&
      clock.phase !== "GAP"
    ) {
      return {
        error: "There is no active question to skip right now.",
        status: 409,
      };
    }

    const currentIndex = clock.index;
    const nextIndex = currentIndex + 1;

    // Skipping the final question ends the quiz immediately.
    if (nextIndex >= run.questions.length) {
      const updated = await tx.quizRun.updateMany({
        where: {
          id: "main",
          status: run.status,
          skipMs: run.skipMs,
          pausedAt: run.pausedAt,
        },
        data: {
          status: "ENDED",
          endedAt: now,
          pausedAt: null,
        },
      });

      if (updated.count !== 1) {
        return {
          error: "Quiz state changed. Refresh and try again.",
          status: 409,
        };
      }

      return {
        success: true,
        status: "ENDED",
        message: "The final question was skipped. Quiz ended.",
      };
    }

    // Calculate the timeline offset where the next question begins.
    const nextQuestionStartOffsetMs = run.questions
      .slice(0, nextIndex)
      .reduce(
        (total, slot) => total + slot.durationMs + slot.gapMs,
        0,
      );

    const effectiveNowMs =
      run.status === "PAUSED" && run.pausedAt
        ? run.pausedAt.getTime()
        : now.getTime();

    const timelineStartMs =
      run.startedAt.getTime() + run.pausedMs;

    const effectiveElapsedMs =
      effectiveNowMs - timelineStartMs + run.skipMs;

    const additionalSkipMs =
      nextQuestionStartOffsetMs - effectiveElapsedMs;

    if (additionalSkipMs <= 0) {
      return {
        error: "The next question timeline has already been reached. Refresh and try again.",
        status: 409,
      };
    }

    const updated = await tx.quizRun.updateMany({
      where: {
        id: "main",
        status: run.status,
        skipMs: run.skipMs,
        pausedAt: run.pausedAt,
      },
      data: {
        skipMs: { increment: additionalSkipMs },
      },
    });

    if (updated.count !== 1) {
      return {
        error: "Quiz state changed. Refresh and try again.",
        status: 409,
      };
    }

    return {
      success: true,
      status: run.status,
      skippedQuestion: currentIndex + 1,
      nextQuestion: nextIndex + 1,
    };
  });

  if ("error" in result) {
    return json(
      { error: result.error },
      typeof result.status === "number" ? result.status : 500,
    );
  }

  return json(result);
}
