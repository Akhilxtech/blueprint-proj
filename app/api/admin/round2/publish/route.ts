
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

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
      const resetSetting = await prisma.setting.findUnique({
        where: { key: RESET_STATE_KEY },
        select: { value: true },
      });

      if (resetSetting?.value === true) {
        return NextResponse.json(
          {
            error:
              "Complete Round 2 re-evaluation and select finalists before publishing.",
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
