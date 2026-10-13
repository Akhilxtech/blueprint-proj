
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound2Snapshot } from "@/lib/round2";
const PUBLISH_FINAL_KEY = "leaderboard.publishFinalResults";

const RESET_STATE_KEY = "round2.resetAwaitingReevaluation";

export async function GET() {
  await requireAdmin();

  try {
    const [snapshot, resetSetting] = await Promise.all([
      getRound2Snapshot(),
      prisma.setting.findUnique({
        where: { key: RESET_STATE_KEY },
        select: { value: true },
      }),
    ]);
const publishSetting = await prisma.setting.findUnique({
  where: { key: PUBLISH_FINAL_KEY },
  select: { value: true },
});

    return NextResponse.json(
      {
        ...snapshot,
        resetAwaitingReevaluation: resetSetting?.value === true,
        publishFinalResults: publishSetting?.value === true,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Round 2 snapshot error:", error);

    return NextResponse.json(
      { error: "Could not load Round 2 scores." },
      { status: 500 },
    );
  }
}
