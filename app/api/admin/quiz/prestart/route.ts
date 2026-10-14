
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

// export const runtime = "nodejs"

export async function GET() {
  await requireAdmin();

  const now = new Date();
  const cutoff = new Date(now.getTime() - 30_000);

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      rulesAcceptedAt: true,
      lastSeenAt: true,
      quizStatus: true,
      _count: { select: { participants: true } },
    },
  });

  const eligibleTeams = teams.filter(
    (team) =>
      team.rulesAcceptedAt !== null &&
      team.lastSeenAt !== null &&
      team.lastSeenAt >= cutoff &&
      team.quizStatus === "ACTIVE",
  );

  return NextResponse.json(
    {
      serverNow: now.toISOString(),
      readinessWindowSeconds: 30,
      totalTeams: teams.length,
      eligibleTeams: eligibleTeams.length,
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        participantCount: team._count.participants,
        rulesAccepted: team.rulesAcceptedAt !== null,
        lastSeenAt: team.lastSeenAt,
        quizStatus: team.quizStatus,
        ready: eligibleTeams.some((eligible) => eligible.id === team.id),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
