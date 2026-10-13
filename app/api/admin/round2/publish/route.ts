
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound2Snapshot } from "@/lib/round2";

const PUBLISH_FINAL_KEY = "leaderboard.publishFinalResults";
const RESET_STATE_KEY = "round2.resetAwaitingReevaluation";

export async function POST(request: NextRequest) {
  await requireAdmin();

  try {
    const body = await request.json();
    const published = body.published;

    if (typeof published !== "boolean") {
      return NextResponse.json(
        { error: "published must be a boolean." },
        { status: 400 },
      );
    }

    if (published) {
      // Prevent publishing while Round 2 re-evaluation is pending.
      const resetSetting = await prisma.setting.findUnique({
        where: { key: RESET_STATE_KEY },
        select: { value: true },
      });

      if (resetSetting?.value === true) {
        return NextResponse.json(
          {
            error:
              "Complete Round 2 re-evaluation and select finalists before publishing.",
            code: "ROUND2_REEVALUATION_PENDING",
          },
          { status: 409 },
        );
      }

      // Prevent publishing when an exact tie crosses the finalist cutoff.
      const snapshot = await getRound2Snapshot();

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
              "The finalist cutoff has an unresolved exact tie. Review the tied teams before publishing final results.",
            code: "FINALIST_CUTOFF_TIE",
            tiedTeams,
          },
          { status: 409 },
        );
      }
    }

    await prisma.setting.upsert({
      where: { key: PUBLISH_FINAL_KEY },
      create: {
        key: PUBLISH_FINAL_KEY,
        value: published,
      },
      update: {
        value: published,
      },
    });

    return NextResponse.json({
      success: true,
      published,
      message: published
        ? "Final leaderboard published."
        : "Final leaderboard unpublished.",
    });
  } catch (error) {
    console.error("Leaderboard publish error:", error);

    return NextResponse.json(
      { error: "Could not update leaderboard publication status." },
      { status: 500 },
    );
  }
}
