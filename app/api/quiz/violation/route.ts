
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";
import { getSettings } from "@/lib/settings";

const violationSchema = z.object({
  clientEventId: z.string().uuid(),
  startedAt: z.string().datetime({ offset: true }),
  durationMs: z.number().int().min(0).max(86_400_000),
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const { team: participantTeam } = await requireParticipant();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = violationSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error: "Invalid violation payload",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const { clientEventId, startedAt, durationMs } = parsed.data;
  const startedAtDate = new Date(startedAt);
  const settings = await getSettings();

  if (durationMs < settings.minAwaySeconds * 1000) {
    return json({
      success: true,
      ignored: true,
      reason: "AWAY_DURATION_TOO_SHORT",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const rosterEntry = await tx.quizRoster.findUnique({
        where: { teamId: participantTeam.id },
        select: { teamId: true },
      });

      if (!rosterEntry) {
        return {
          error: "Team is not on the quiz roster",
          status: 403,
        } as const;
      }

      const currentTeam = await tx.team.findUnique({
        where: { id: participantTeam.id },
        select: {
          quizStatus: true,
          warningCount: true,
        },
      });

      if (!currentTeam) {
        return { error: "Team not found", status: 404 } as const;
      }

      // Check duplicates before phase validation so a retry of an
      // already-processed event remains idempotent.
      const existing = await tx.violationEvent.findUnique({
        where: { clientEventId },
        select: { teamId: true },
      });

      if (existing) {
        if (existing.teamId !== participantTeam.id) {
          return {
            error: "Violation event ID already belongs to another team",
            status: 409,
          } as const;
        }

        return {
          success: true,
          duplicate: true,
          warningCount: currentTeam.warningCount,
          maxWarnings: settings.maxWarnings,
          eliminated: currentTeam.quizStatus === "ELIMINATED",
        } as const;
      }

      if (currentTeam.quizStatus !== "ACTIVE") {
        return {
          error: "Team is eliminated",
          status: 403,
          warningCount: currentTeam.warningCount,
          maxWarnings: settings.maxWarnings,
          eliminated: true,
        } as const;
      }

      const run = await tx.quizRun.findUnique({
        where: { id: "main" },
        include: {
          questions: { orderBy: { position: "asc" } },
        },
      });

      if (!run || run.status !== "RUNNING") {
        return {
          success: true,
          ignored: true,
          reason: "QUIZ_NOT_RUNNING",
        } as const;
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
        return {
          success: true,
          ignored: true,
          reason: "QUIZ_NOT_ACTIVE",
        } as const;
      }

      // Database uniqueness protects against concurrent retries.
      const inserted = await tx.violationEvent.createMany({
        data: [
          {
            teamId: participantTeam.id,
            clientEventId,
            startedAt: startedAtDate,
            durationMs,
          },
        ],
        skipDuplicates: true,
      });

      if (inserted.count === 0) {
        const duplicate = await tx.violationEvent.findUnique({
          where: { clientEventId },
          select: { teamId: true },
        });

        if (duplicate?.teamId !== participantTeam.id) {
          return {
            error: "Violation event ID already belongs to another team",
            status: 409,
          } as const;
        }

        const latestTeam = await tx.team.findUniqueOrThrow({
          where: { id: participantTeam.id },
          select: { warningCount: true, quizStatus: true },
        });

        return {
          success: true,
          duplicate: true,
          warningCount: latestTeam.warningCount,
          maxWarnings: settings.maxWarnings,
          eliminated: latestTeam.quizStatus === "ELIMINATED",
        } as const;
      }

      // Increment is atomic in PostgreSQL. This returned count is
      // the updated value, not a value calculated by the client.
      const updatedTeam = await tx.team.update({
        where: { id: participantTeam.id },
        data: {
          warningCount: { increment: 1 },
          lastSeenAt: new Date(),
        },
        select: {
          warningCount: true,
          quizStatus: true,
        },
      });

      const shouldEliminate =
        settings.maxWarnings > 0 &&
        updatedTeam.warningCount >= settings.maxWarnings;

      const finalTeam = shouldEliminate
        ? await tx.team.update({
            where: { id: participantTeam.id },
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
        success: true,
        duplicate: false,
        warningCount: finalTeam.warningCount,
        maxWarnings: settings.maxWarnings,
        eliminated: finalTeam.quizStatus === "ELIMINATED",
      } as const;
    });

    if ("error" in result) {
      const { status, ...body } = result;
      return json(body, status);
    }

    return json(result);
  } catch (error) {
    console.error("Failed to record quiz violation:", error);
    return json({ error: "Could not record violation" }, 500);
  }
}
