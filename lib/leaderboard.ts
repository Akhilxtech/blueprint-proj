
import "server-only";

import { prisma } from "@/lib/db";

export type LeaderboardEntry = {
  teamId: string;
  teamName: string;
  score: number;
  round1Percent: number;
  totalCorrectMs: number;
  fastestCorrectCount: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return prisma.$queryRaw<LeaderboardEntry[]>`
    WITH run_questions AS (
      SELECT
        qr."questionId",
        q."marks"
      FROM "quiz_run_questions" qr
      INNER JOIN "questions" q
        ON q."id" = qr."questionId"
      WHERE qr."runId" = 'main'
    ),
    total_possible AS (
      SELECT COALESCE(SUM("marks"), 0)::int AS total_marks
      FROM run_questions
    ),
    roster_answers AS (
      SELECT
        r."teamId",
        r."questionId",
        r."optionId",
        r."responseMs",
        rq."marks",
        qo."isCorrect"
      FROM "responses" r
      INNER JOIN "quiz_roster" roster
        ON roster."teamId" = r."teamId"
      INNER JOIN run_questions rq
        ON rq."questionId" = r."questionId"
      INNER JOIN "question_options" qo
        ON qo."id" = r."optionId"
       AND qo."questionId" = r."questionId"
    ),
    correct_answers AS (
      SELECT *
      FROM roster_answers
      WHERE "isCorrect" = TRUE
    ),
    fastest_correct AS (
      SELECT
        "teamId",
        "questionId",
        ROW_NUMBER() OVER (
          PARTITION BY "questionId"
          ORDER BY "responseMs" ASC, "teamId" ASC
        ) AS response_rank
      FROM correct_answers
    ),
    team_stats AS (
      SELECT
        t."id" AS team_id,
        COALESCE(
          SUM(ca."marks"),
          0
        )::int AS score,
        COALESCE(
          SUM(ca."responseMs"),
          0
        )::bigint AS total_correct_ms,
        COUNT(fc."questionId")::int AS fastest_correct_count
      FROM "teams" t
      INNER JOIN "quiz_roster" roster
        ON roster."teamId" = t."id"
      LEFT JOIN correct_answers ca
        ON ca."teamId" = t."id"
      LEFT JOIN fastest_correct fc
        ON fc."teamId" = t."id"
       AND fc."questionId" = ca."questionId"
       AND fc.response_rank = 1
      GROUP BY t."id"
    )
    SELECT
      t."id" AS "teamId",
      t."name" AS "teamName",
      COALESCE(ts.score, 0)::int AS score,
      CASE
        WHEN tp.total_marks > 0
         AND roster."teamId" IS NOT NULL
        THEN ROUND(
          COALESCE(ts.score, 0)::numeric
          * 100 / tp.total_marks,
          2
        )::float8
        ELSE 0::float8
      END AS "round1Percent",
      CASE
        WHEN roster."teamId" IS NOT NULL
        THEN COALESCE(ts.total_correct_ms, 0)::bigint
        ELSE 0::bigint
      END AS "totalCorrectMs",
      CASE
        WHEN roster."teamId" IS NOT NULL
        THEN COALESCE(ts.fastest_correct_count, 0)::int
        ELSE 0
      END AS "fastestCorrectCount"
    FROM "teams" t
    CROSS JOIN total_possible tp
    LEFT JOIN "quiz_roster" roster
      ON roster."teamId" = t."id"
    LEFT JOIN team_stats ts
      ON ts.team_id = t."id"
    ORDER BY
      score DESC,
      "totalCorrectMs" ASC,
      "fastestCorrectCount" DESC,
      "teamName" ASC
  `;
}
