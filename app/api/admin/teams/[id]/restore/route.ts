
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  await requireAdmin();

  const { id } = await context.params;

  if (!id?.trim()) {
    return json({ error: "Team ID is required." }, 400);
  }

  const result = await prisma.team.updateMany({
    where: { id },
    data: {
      quizStatus: "ACTIVE",
      warningCount: 0,
      eliminatedAt: null,
    },
  });

  if (result.count !== 1) {
    return json({ error: "Team not found." }, 404);
  }

  return json({
    success: true,
    teamId: id,
    quizStatus: "ACTIVE",
    warningCount: 0,
    eliminatedAt: null,
  });
}
