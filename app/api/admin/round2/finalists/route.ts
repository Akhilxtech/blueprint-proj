
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound2Snapshot } from "@/lib/round2";

export async function POST() {
  await requireAdmin();

  try {
    const snapshot = await getRound2Snapshot();

    const finalistIds = snapshot.rows
      .slice(0, snapshot.finalistCount)
      .map((row) => row.teamId);

   await prisma.$transaction(async (tx) => {
  await tx.team.updateMany({
    data: { isFinalist: false },
  });

  if (finalistIds.length > 0) {
    await tx.team.updateMany({
      where: { id: { in: finalistIds } },
      data: { isFinalist: true },
    });
  }

  await tx.setting.upsert({
    where: { key: "round2.resetAwaitingReevaluation" },
    create: {
      key: "round2.resetAwaitingReevaluation",
      value: false,
    },
    update: {
      value: false,
    },
  });
});

    return NextResponse.json({
      success: true,
      finalistCount: finalistIds.length,
      finalists: snapshot.rows
        .filter((row) => finalistIds.includes(row.teamId))
        .map((row) => ({
          teamId: row.teamId,
          teamName: row.teamName,
          rank: row.rank,
          combined: row.combined,
          suddenDeathTie: row.suddenDeathTie,
          cutLineTie: row.cutLineTie,
        })),
      warning: snapshot.cutLineTie
        ? "An exact tie spans the finalist cut line. Review sudden death before finalizing the shortlist."
        : null,
    });
  } catch (error) {
    console.error("Round 2 finalist selection error:", error);

    return NextResponse.json(
      { error: "Could not update finalists." },
      { status: 500 },
    );
  }
}
