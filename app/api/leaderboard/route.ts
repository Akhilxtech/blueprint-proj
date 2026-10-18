
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/db";
// import { getLeaderboard } from "@/lib/leaderboard";
// import { getRound2Snapshot } from "@/lib/round2";

// const PUBLISH_FINAL_KEY = "leaderboard.publishFinalResults";

// export async function GET() {
//   try {
//     const [round1, publishSetting] = await Promise.all([
//       getLeaderboard(),
//       prisma.setting.findUnique({
//         where: { key: PUBLISH_FINAL_KEY },
//         select: { value: true },
//       }),
//     ]);

//     const finalPublished = publishSetting?.value === true;

//     const round1MaxResult = await prisma.$queryRaw<
//       { totalMarks: number }[]
//     >`
//       SELECT COALESCE(SUM(q."marks"), 0)::int AS "totalMarks"
//       FROM "quiz_run_questions" qr
//       INNER JOIN "questions" q
//         ON q."id" = qr."questionId"
//       WHERE qr."runId" = 'main'
//     `;

//     const round1MaxMarks = Number(
//       round1MaxResult[0]?.totalMarks ?? 0,
//     );

//     console.log("Leaderboard serialization check:", {
//   score: typeof round1[0]?.score,
//   round1Percent: typeof round1[0]?.round1Percent,
//   totalCorrectMs: typeof round1[0]?.totalCorrectMs,
//   round1MaxMarks: typeof round1MaxMarks,
//   publishSetting: typeof publishSetting?.value,
// });

//     if (!finalPublished) {
//       return NextResponse.json(
//         {
//           stage: "ROUND_1",
//           finalPublished: false,
//           round1MaxMarks,
//          teams: round1.map((team, index) => ({
//   rank: index + 1,
//   teamId: team.teamId,
//   teamName: team.teamName,
//   round1Score: team.score,
//   round1MaxMarks,
//   round1Percent: team.round1Percent,
//  totalCorrectMs: Number(team.totalCorrectMs),
// })),
//         },
//         { headers: { "Cache-Control": "no-store" } },
//       );
//     }

//     const snapshot = await getRound2Snapshot();

//     return NextResponse.json(
//       {
//         stage: "FINAL",
//         finalPublished: true,
//         settings: snapshot.settings,
//         round1MaxMarks,
// teams: snapshot.rows.map((team) => ({
//   rank: team.rank,
//   teamId: team.teamId,
//   teamName: team.teamName,
//   round1Score: team.round1Score,
//   round1MaxMarks: team.round1MaxMarks,
//   round1Percent: team.round1Percent,
//   totalCorrectMs: Number(team.totalCorrectMs),
//   round2Score: team.round2Total,
//   round2MaxMarks: team.round2MaxMarks,
//   round2Percent: team.round2Percent,
//   combined: team.combined,
//   status: team.isFinalist ? "Selected" : "Not Selected",
//   tieBreakReason: team.whyRankedHere,
//   timeDecided: team.whyRankedHere.includes(
//     "lower Round 1 correct-answer time decided the order",
//   ),
//   unresolvedTie: team.suddenDeathTie,
// })),
//       },
//       { headers: { "Cache-Control": "no-store" } },
//     );
//   } catch (error) {
//     console.error("Public leaderboard error:", error);

//     return NextResponse.json(
//       { error: "Could not load leaderboard." },
//       {
//         status: 500,
//         headers: { "Cache-Control": "no-store" },
//       },
//     );
//   }
// }




import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLeaderboard } from "@/lib/leaderboard";
import { getRound2Snapshot } from "@/lib/round2";

const PUBLISH_FINAL_KEY = "leaderboard.publishFinalResults";

export async function GET() {
  try {
    const publishSetting = await prisma.setting.findUnique({
      where: { key: PUBLISH_FINAL_KEY },
      select: { value: true },
    });

    const finalPublished = publishSetting?.value === true;

    if (finalPublished) {
      const snapshot = await getRound2Snapshot();

      return NextResponse.json(
        {
          stage: "FINAL",
          finalPublished: true,
          settings: snapshot.settings,
          round1MaxMarks: snapshot.rows[0]?.round1MaxMarks ?? 0,
          teams: snapshot.rows.map((team) => ({
            rank: team.rank,
            teamId: team.teamId,
            teamName: team.teamName,
            round1Score: team.round1Score,
            round1MaxMarks: team.round1MaxMarks,
            round1Percent: team.round1Percent,
            totalCorrectMs: Number(team.totalCorrectMs),
            round2Score: team.round2Total,
            round2MaxMarks: team.round2MaxMarks,
            round2Percent: team.round2Percent,
            combined: team.combined,
            status: team.isFinalist ? "Selected" : "Not Selected",
            tieBreakReason: team.whyRankedHere,
            timeDecided: team.whyRankedHere.includes(
              "lower Round 1 correct-answer time decided the order",
            ),
            unresolvedTie: team.suddenDeathTie,
          })),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const [round1, round1MaxResult] = await Promise.all([
      getLeaderboard(),
      prisma.$queryRaw<{ totalMarks: number }[]>`
        SELECT COALESCE(SUM(q."marks"), 0)::int AS "totalMarks"
        FROM "quiz_run_questions" qr
        INNER JOIN "questions" q
          ON q."id" = qr."questionId"
        WHERE qr."runId" = 'main'
      `,
    ]);

    const round1MaxMarks = Number(
      round1MaxResult[0]?.totalMarks ?? 0,
    );

    return NextResponse.json(
      {
        stage: "ROUND_1",
        finalPublished: false,
        round1MaxMarks,
        teams: round1.map((team, index) => ({
          rank: index + 1,
          teamId: team.teamId,
          teamName: team.teamName,
          round1Score: team.score,
          round1MaxMarks,
          round1Percent: team.round1Percent,
          totalCorrectMs: Number(team.totalCorrectMs),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Public leaderboard error:", error);

    return NextResponse.json(
      { error: "Could not load leaderboard." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
