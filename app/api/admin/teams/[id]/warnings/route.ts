
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const bodySchema = z.object({
  delta: z.union([z.literal(1), z.literal(-1)]),
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  await requireAdmin();

  const { id } = await context.params;

  if (!id?.trim()) {
    return json({ error: "Team ID is required." }, 400);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return json(
      { error: "delta must be either 1 or -1." },
      400,
    );
  }

  const { delta } = parsed.data;
  const settings = await getSettings();

  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { id },
      select: {
        id: true,
        warningCount: true,
        quizStatus: true,
        eliminatedAt: true,
      },
    });

    if (!team) {
      return { error: "Team not found.", status: 404 as const };
    }

    if (delta === 1) {
      await tx.team.update({
        where: { id },
        data: { warningCount: { increment: 1 } },
      });
    } else if (team.warningCount > 0) {
      await tx.team.update({
        where: { id },
        data: { warningCount: { decrement: 1 } },
      });
    }

    const updatedTeam = await tx.team.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        warningCount: true,
        quizStatus: true,
        eliminatedAt: true,
      },
    });

    const shouldEliminate =
      settings.maxWarnings > 0 &&
      updatedTeam.warningCount >= settings.maxWarnings &&
      updatedTeam.quizStatus !== "ELIMINATED";

    if (shouldEliminate) {
      await tx.team.update({
        where: { id },
        data: {
          quizStatus: "ELIMINATED",
          eliminatedAt: new Date(),
        },
      });
    }

    const finalTeam = shouldEliminate
      ? await tx.team.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            warningCount: true,
            quizStatus: true,
            eliminatedAt: true,
          },
        })
      : updatedTeam;

    return {
      success: true,
      teamId: finalTeam.id,
      warningCount: finalTeam.warningCount,
      maxWarnings: settings.maxWarnings,
      quizStatus: finalTeam.quizStatus,
      eliminatedAt: finalTeam.eliminatedAt?.toISOString() ?? null,
    };
  });

  if ("error" in result) {
    return json({ error: result.error }, result.status);
  }

  return json(result);
}

