
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound2Snapshot } from "@/lib/round2";

export async function POST() {
  await requireAdmin();

  try {
    const snapshot = await getRound2Snapshot();

    // Never select finalists automatically when the cutoff is tied.
    // Return before modifying any team or setting.
    if (snapshot.cutLineTie) {
      const tiedTeams = snapshot.rows
        .filter((row) => row.cutLineTie)
        .map((row) => ({
          teamId: row.teamId,
          teamName: row.teamName,
          rank: row.rank,
          combined: row.combined,
          round2Percent: row.round2Percent,
          round1Percent: row.round1Percent,
          sectionC: row.sectionC,
          totalCorrectMs: row.totalCorrectMs,
          whyRankedHere: row.whyRankedHere,
        }));

      return NextResponse.json(
        {
          error:
            "An exact tie spans the finalist cutoff. Review the tied teams before selecting finalists.",
          code: "FINALIST_CUTOFF_TIE",
          tiedTeams,
        },
        { status: 409 },
      );
    }

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
        })),
      warning: null,
    });
  } catch (error) {
    console.error("Round 2 finalist selection error:", error);

    return NextResponse.json(
      { error: "Could not update finalists." },
      { status: 500 },
    );
  }
}
