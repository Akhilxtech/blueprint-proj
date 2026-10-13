
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { getLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/db";


function csvCell(value: string | number) {
  let text = String(value);

  // Prevent spreadsheet formula execution in exported text fields.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    await requireAdmin();

    const [leaderboard, teams] = await Promise.all([
      getLeaderboard(),
      prisma.team.findMany({
        select: {
          id: true,
          name: true,
          quizStatus: true,
          warningCount: true,
        },
      }),
    ]);

    const teamById = new Map(teams.map((team) => [team.id, team]));

    const header = [
      "Rank",
      "Team",
      "Score",
      "Round 1 Percentage",
      "Total Correct Time (ms)",
      "Fastest Correct Count",
      "Warnings",
      "Status",
    ];

    const lines = [
      header.map(csvCell).join(","),
      ...leaderboard.map((entry, index) => {
        const team = teamById.get(entry.teamId);

        return [
          index + 1,
          entry.teamName,
          entry.score,
          entry.round1Percent,
          Number(entry.totalCorrectMs),
          entry.fastestCorrectCount,
          team?.warningCount ?? 0,
          team?.quizStatus ?? "UNKNOWN",
        ]
          .map(csvCell)
          .join(",");
      }),
    ];

    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="blueprint-to-live-results.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Results CSV export error:", error);

    return NextResponse.json(
      { error: "Could not export quiz results." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
