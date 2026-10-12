
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";
import { getSettings } from "@/lib/settings";

const violationSchema = z.object({
  eventId: z.string().uuid(),
  awayDurationMs: z.number().int().min(0).max(86_400_000),
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const { team } = await requireParticipant();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = violationSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: "Invalid violation payload" }, 400);
  }

  const { eventId, awayDurationMs } = parsed.data;
  const settings = await getSettings();

  if (awayDurationMs < settings.minAwaySeconds * 1000) {
    return json({ ignored: true, reason: "AWAY_DURATION_TOO_SHORT" });
  }

  const rosterEntry = await prisma.quizRoster.findUnique({
    where: { teamId: team.id },
    select: { teamId: true },
  });

  if (!rosterEntry) {
    return json({ error: "Team is not on the quiz roster" }, 403);
  }

  const run = await prisma.quizRun.findUnique({
    where: { id: "main" },
    include: {
      questions: { orderBy: { position: "asc" } },
    },
  });

  if (!run || run.status !== "RUNNING") {
    return json({ ignored: true, reason: "QUIZ_NOT_RUNNING" });
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
    Date.now(),
  );

  if (clock.phase !== "QUESTION" && clock.phase !== "GAP") {
    return json({ ignored: true, reason: "QUIZ_NOT_ACTIVE" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // The unique eventId makes repeat submissions idempotent.
      await tx.tabSwitchViolation.create({
        data: {
          eventId,
          teamId: team.id,
          awayDurationMs,
        },
      });

      const currentTeam = await tx.team.findUnique({
        where: { id: team.id },
        select: { quizStatus: true },
      });

      if (!currentTeam || currentTeam.quizStatus !== "ACTIVE") {
        // Throwing rolls back the violation insert too.
        throw new Error("TEAM_NOT_ACTIVE");
      }

      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: {
          warningCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
        select: {
          warningCount: true,
          quizStatus: true,
        },
      });

      const eliminated =
        settings.maxWarnings > 0 &&
        updatedTeam.warningCount >= settings.maxWarnings;

      const finalTeam = eliminated
        ? await tx.team.update({
            where: { id: team.id },
            data: {
              quizStatus: "ELIMINATED",
              eliminatedAt: new Date(),
            },
            select: {
              warningCount: true,
              quizStatus: true,
            },
          })
        : updatedTeam;

      return {
        warningCount: finalTeam.warningCount,
        quizStatus: finalTeam.quizStatus,
        eliminated,
      };
    });

    return json({
      success: true,
      duplicate: false,
      ...result,
      maxWarnings: settings.maxWarnings,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_NOT_ACTIVE") {
      return json({ ignored: true, reason: "TEAM_NOT_ACTIVE" });
    }

    // A repeated eventId must never increment the warning count twice.
    const existing = await prisma.tabSwitchViolation.findUnique({
      where: { eventId },
      select: { id: true, teamId: true },
    });

    if (existing?.teamId === team.id) {
      const currentTeam = await prisma.team.findUnique({
        where: { id: team.id },
        select: { warningCount: true, quizStatus: true },
      });

      return json({
        success: true,
        duplicate: true,
        warningCount: currentTeam?.warningCount ?? 0,
        quizStatus: currentTeam?.quizStatus ?? "ELIMINATED",
        maxWarnings: settings.maxWarnings,
      });
    }

    console.error("Failed to record tab-switch violation:", error);
    return json({ error: "Could not record violation" }, 500);
  }
}
