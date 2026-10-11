
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  await requireAdmin();

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.quizRun.findUnique({
      where: { id: "main" },
      select: { id: true, status: true },
    });

    if (!run) {
      return { error: "No quiz run exists to reset.", status: 404 };
    }

    if (run.status === "RUNNING" || run.status === "PAUSED") {
      return {
        error: "End the quiz before resetting practice.",
        status: 409,
      };
    }

    // Responses have no runId, so these belong to the single main quiz.
    const deletedResponses = await tx.response.deleteMany();
    const deletedRoster = await tx.quizRoster.deleteMany();

    await tx.team.updateMany({
      data: {
        quizStatus: "ACTIVE",
        warningCount: 0,
        eliminatedAt: null,
        isFinalist: false,
      },
    });

    const updated = await tx.quizRun.updateMany({
      where: {
        id: "main",
        status: run.status,
      },
      data: {
        status: "NOT_STARTED",
        startedAt: null,
        pausedAt: null,
        pausedMs: 0,
        skipMs: 0,
        endedAt: null,
      },
    });

    if (updated.count !== 1) {
      throw new Error("Quiz state changed during reset. Please retry.");
    }

    return {
      success: true,
      status: "NOT_STARTED",
      deletedResponses: deletedResponses.count,
      removedRosterEntries: deletedRoster.count,
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
