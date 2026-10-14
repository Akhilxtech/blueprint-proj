
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

// export const runtime = "nodejs"

function json(
  body: Record<string, unknown>,
  status: number = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST() {
  await requireAdmin();

  const settings = await getSettings();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30_000);
  const startedAt = new Date(
    now.getTime() + settings.prestartSeconds * 1000,
  );

  const result = await prisma.$transaction(async (tx) => {
    const existingRun = await tx.quizRun.findUnique({
      where: { id: "main" },
    });

    if (
      existingRun?.status === "RUNNING" ||
      existingRun?.status === "PAUSED"
    ) {
      return {
        error: "Quiz is already running or paused",
        status: 409,
      };
    }

    if (existingRun?.status === "ENDED") {
      return {
        error: "Reset the previous quiz before starting another",
        status: 409,
      };
    }

    const previousResponses = await tx.response.count();

    if (previousResponses > 0) {
      return {
        error: "Existing responses found. Reset practice before starting",
        status: 409,
      };
    }

    const questions = await tx.question.findMany({
      where: { included: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: {
        id: true,
        type: true,
        timeSeconds: true,
      },
    });

    if (questions.length === 0) {
      return {
        error: "No included questions are available",
        status: 400,
      };
    }

    const eligibleTeams = await tx.team.findMany({
      where: {
        rulesAcceptedAt: { not: null },
        lastSeenAt: { gte: cutoff },
        quizStatus: "ACTIVE",
      },
      select: { id: true },
    });

    if (eligibleTeams.length === 0) {
      return {
        error: "No teams are ready. Ask participants to accept the rules and check in.",
        status: 400,
      };
    }

    const run = await tx.quizRun.upsert({
      where: { id: "main" },
      create: {
        id: "main",
        status: "RUNNING",
        startedAt,
        pausedAt: null,
        pausedMs: 0,
        skipMs: 0,
        endedAt: null,
      },
      update: {
        status: "RUNNING",
        startedAt,
        pausedAt: null,
        pausedMs: 0,
        skipMs: 0,
        endedAt: null,
      },
    });

    await tx.quizRunQuestion.deleteMany({
      where: { runId: run.id },
    });

    await tx.quizRoster.deleteMany();

    await tx.quizRunQuestion.createMany({
      data: questions.map((question, index) => {
        const seconds =
          question.timeSeconds !== null && question.timeSeconds > 0
            ? question.timeSeconds
            : question.type.toUpperCase() === "THEORY"
              ? settings.theorySeconds
              : question.type.toUpperCase() === "CODE"
                ? settings.codeSeconds
                : settings.fallbackSeconds;

        return {
          runId: run.id,
          position: index,
          questionId: question.id,
          durationMs: seconds * 1000,
          gapMs: settings.gapSeconds * 1000,
        };
      }),
    });

    await tx.quizRoster.createMany({
      data: eligibleTeams.map((team) => ({
        teamId: team.id,
      })),
    });

    return {
      success: true,
      runId: run.id,
      status: run.status,
      startedAt: startedAt.toISOString(),
      prestartSeconds: settings.prestartSeconds,
      questionCount: questions.length,
      rosterCount: eligibleTeams.length,
    };
  });

if ("error" in result) {
  return json(
    { error: result.error },
    typeof result.status === "number" ? result.status : 500,
  );
}
  return json(result, 201);
}
