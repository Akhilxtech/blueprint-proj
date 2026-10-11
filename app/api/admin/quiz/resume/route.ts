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

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.quizRun.findUnique({
      where: { id: "main" },
      select: {
        id: true,
        status: true,
        pausedAt: true,
        pausedMs: true,
      },
    });

    if (!run) {
      return { error: "No quiz run exists.", status: 404 };
    }

    if (run.status !== "PAUSED" || !run.pausedAt) {
      return {
        error: "Only a paused quiz can be resumed.",
        status: 409,
      };
    }

    const pauseDurationMs = now.getTime() - run.pausedAt.getTime();

    if (pauseDurationMs < 0) {
      return {
        error: "Invalid pause timestamp. Quiz was not resumed.",
        status: 409,
      };
    }

    const updated = await tx.quizRun.updateMany({
      where: {
        id: "main",
        status: "PAUSED",
        pausedAt: run.pausedAt,
      },
      data: {
        status: "RUNNING",
        pausedAt: null,
        pausedMs: {
          increment: pauseDurationMs,
        },
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
      status: "RUNNING",
      resumedAt: now.toISOString(),
      pauseDurationMs,
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