
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

const RESET_STATE_KEY = "round2.resetAwaitingReevaluation";

export async function POST() {
  await requireAdmin();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.round2Mark.deleteMany({});

      await tx.setting.upsert({
        where: { key: RESET_STATE_KEY },
        create: {
          key: RESET_STATE_KEY,
          value: true,
        },
        update: {
          value: true,
        },
      });

      return deleted;
    });

    return NextResponse.json({
      success: true,
      deletedMarks: result.count,
      resetAwaitingReevaluation: true,
      message: `Round 2 reset complete. Cleared ${result.count} saved marks. All teams should be reviewed together until re-evaluation is complete.`,
    });
  } catch (error) {
    console.error("Round 2 reset error:", error);

    return NextResponse.json(
      { error: "Could not reset Round 2 marks." },
      { status: 500 },
    );
  }
}
