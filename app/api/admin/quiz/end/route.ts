
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
      },
    });

    if (!run) {
      return { error: "No quiz run exists.", status: 404 };
    }

    if (run.status !== "RUNNING" && run.status !== "PAUSED") {
      return {
        error: "Only a running or paused quiz can be ended.",
        status: 409,
      };
    }

    const updated = await tx.quizRun.updateMany({
      where: {
        id: "main",
        status: run.status,
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
      endedAt: now.toISOString(),
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
