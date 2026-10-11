
import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

export async function POST() {
  const { team } = await requireParticipant();
  const now = new Date();

  const updatedTeam = await prisma.$transaction(async (tx) => {
    // Record acceptance only on the first request.
    await tx.team.updateMany({
      where: {
        id: team.id,
        rulesAcceptedAt: null,
      },
      data: {
        rulesAcceptedAt: now,
      },
    });

    // Always refresh the team's last-seen timestamp.
    return tx.team.update({
      where: {
        id: team.id,
      },
      data: {
        lastSeenAt: now,
      },
      select: {
        id: true,
        rulesAcceptedAt: true,
        lastSeenAt: true,
      },
    });
  });

  return NextResponse.json({
    success: true,
    rulesAcceptedAt: updatedTeam.rulesAcceptedAt,
    lastSeenAt: updatedTeam.lastSeenAt,
  });
}
