
import "server-only";

import { prisma } from "@/lib/db";
import { getLeaderboard } from "@/lib/leaderboard";

export const ROUND2_DEFAULTS = {
  weightRound1: 0.4,
  weightRound2: 0.6,
  finalistCount: 10,
  questionMaxMarks: Array(10).fill(10) as number[],
} as const;

export type Round2Settings = {
  weightRound1: number;
  weightRound2: number;
  finalistCount: number;
  questionMaxMarks: number[];
};

export type Round2Row = {
  teamId: string;
  teamName: string;
  marks: number[];
  sectionA: number;
  sectionB: number;
  sectionC: number;
  sectionAMax: number;
  sectionBMax: number;
  sectionCMax: number;
  round2Total: number;
  round2MaxMarks: number;
  round2Percent: number;
  round1Score: number;
  round1MaxMarks: number;
  round1Percent: number;
  totalCorrectMs: number;
  combined: number;
  rank: number;
  isFinalist: boolean;
  suddenDeathTie: boolean;
  cutLineTie: boolean;
  whyRankedHere: string;
};

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function readSetting(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readQuestionMaxMarks(value: unknown): number[] {
  if (
    Array.isArray(value) &&
    value.length === 10 &&
    value.every(
      (mark) =>
        typeof mark === "number" &&
        Number.isInteger(mark) &&
        mark >= 1 &&
        mark <= 10000,
    )
  ) {
    return [...value];
  }

  return [...ROUND2_DEFAULTS.questionMaxMarks];
}

export async function getRound2Settings(): Promise<Round2Settings> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "round2.weightRound1",
          "round2.weightRound2",
          "round2.finalistCount",
          "round2.questionMaxMarks",
        ],
      },
    },
    select: { key: true, value: true },
  });

  const values = new Map(rows.map((row) => [row.key, row.value]));

  const weightRound1 = readSetting(
    values.get("round2.weightRound1"),
    ROUND2_DEFAULTS.weightRound1,
  );

  const weightRound2 = readSetting(
    values.get("round2.weightRound2"),
    ROUND2_DEFAULTS.weightRound2,
  );

  const finalistCount = readSetting(
    values.get("round2.finalistCount"),
    ROUND2_DEFAULTS.finalistCount,
  );

  const questionMaxMarks = readQuestionMaxMarks(
    values.get("round2.questionMaxMarks"),
  );

  return {
    weightRound1,
    weightRound2,
    finalistCount,
    questionMaxMarks,
  };
}

function compareScores(a: Round2Row, b: Round2Row): number {
  return (
    b.combined - a.combined ||
    b.round2Percent - a.round2Percent ||
    b.round1Percent - a.round1Percent ||
    b.sectionC - a.sectionC ||
    a.totalCorrectMs - b.totalCorrectMs ||
    a.teamName.localeCompare(b.teamName)
  );
}

function sameRankCriteria(a: Round2Row, b: Round2Row): boolean {
  return (
    a.combined === b.combined &&
    a.round2Percent === b.round2Percent &&
    a.round1Percent === b.round1Percent &&
    a.sectionC === b.sectionC &&
    a.totalCorrectMs === b.totalCorrectMs
  );
}

function explainRank(
  row: Round2Row,
  previous: Round2Row | undefined,
): string {
  if (!previous) return "Highest combined score.";

  if (row.combined !== previous.combined) {
    return "Separated by combined score.";
  }

  if (row.round2Percent !== previous.round2Percent) {
    return "Combined scores tied; Round 2 percentage decided the order.";
  }

  if (row.round1Percent !== previous.round1Percent) {
    return "Earlier criteria tied; Round 1 percentage decided the order.";
  }

  if (row.sectionC !== previous.sectionC) {
    return "Earlier criteria tied; Section C raw score decided the order.";
  }

  if (row.totalCorrectMs !== previous.totalCorrectMs) {
    return "Earlier criteria tied; lower Round 1 correct-answer time decided the order.";
  }

  return "Exact tie. Review required.";
}

export async function getRound2Snapshot() {
 const [
  settings,
  teams,
  savedMarks,
  leaderboard,
  round1MaxMarksResult,
] = await Promise.all([
  getRound2Settings(),

  prisma.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isFinalist: true,
    },
  }),

  prisma.round2Mark.findMany({
    select: {
      teamId: true,
      questionNo: true,
      marks: true,
    },
  }),

  getLeaderboard(),

  prisma.$queryRaw<{ totalMarks: number }[]>`
    SELECT COALESCE(SUM(q."marks"), 0)::int AS "totalMarks"
    FROM "quiz_run_questions" qr
    INNER JOIN "questions" q
      ON q."id" = qr."questionId"
    WHERE qr."runId" = 'main'
  `,
]);

  const marksByTeam = new Map<string, number[]>();

  for (const team of teams) {
    marksByTeam.set(team.id, Array(10).fill(0));
  }

  for (const mark of savedMarks) {
    if (mark.questionNo >= 1 && mark.questionNo <= 10) {
      marksByTeam.get(mark.teamId)?.splice(
        mark.questionNo - 1,
        1,
        mark.marks,
      );
    }
  }

  const round1ByTeam = new Map(
    leaderboard.map((entry) => [
      entry.teamId,
      {
        score: Number(entry.score),
        percent: Number(entry.round1Percent),
        correctMs: Number(entry.totalCorrectMs),
      },
    ]),
  );

 const round1MaxMarks = Number(
  round1MaxMarksResult[0]?.totalMarks ?? 0,
);
  const sectionAMax = settings.questionMaxMarks
    .slice(0, 4)
    .reduce((total, mark) => total + mark, 0);

  const sectionBMax = settings.questionMaxMarks
    .slice(4, 7)
    .reduce((total, mark) => total + mark, 0);

  const sectionCMax = settings.questionMaxMarks
    .slice(7, 10)
    .reduce((total, mark) => total + mark, 0);

  const round2MaxMarks = settings.questionMaxMarks.reduce(
    (total, mark) => total + mark,
    0,
  );

  const rows: Round2Row[] = teams.map((team) => {
    const marks = marksByTeam.get(team.id) ?? Array(10).fill(0);
    const round1 = round1ByTeam.get(team.id);

    const sectionA = marks.slice(0, 4).reduce((a, b) => a + b, 0);
    const sectionB = marks.slice(4, 7).reduce((a, b) => a + b, 0);
    const sectionC = marks.slice(7, 10).reduce((a, b) => a + b, 0);

    const round2Total = sectionA + sectionB + sectionC;

    const round2Percent =
      round2MaxMarks > 0
        ? round((round2Total / round2MaxMarks) * 100, 2)
        : 0;

    const round1Score = round1?.score ?? 0;
    const round1Percent = round1?.percent ?? 0;
    const totalCorrectMs = round1?.correctMs ?? 0;

    const combined = round(
      round1Percent * settings.weightRound1 +
        round2Percent * settings.weightRound2,
      2,
    );

    return {
      teamId: team.id,
      teamName: team.name,
      marks,
      sectionA,
      sectionB,
      sectionC,
      sectionAMax,
      sectionBMax,
      sectionCMax,
      round2Total,
      round2MaxMarks,
      round2Percent,
      round1Score,
      round1MaxMarks,
      round1Percent,
      totalCorrectMs,
      combined,
      rank: 0,
      isFinalist: team.isFinalist,
      suddenDeathTie: false,
      cutLineTie: false,
      whyRankedHere: "",
    };
  });

  
rows.sort(compareScores);

for (let i = 0; i < rows.length; i++) {
  const previous = rows[i - 1];

  if (previous && sameRankCriteria(rows[i], previous)) {
    rows[i].rank = previous.rank;
  } else {
    rows[i].rank = i + 1;
  }

  rows[i].whyRankedHere = explainRank(rows[i], previous);
}


  const finalistCount = Math.min(settings.finalistCount, rows.length);

  let start = 0;

  while (start < rows.length) {
    let end = start + 1;

    while (
      end < rows.length &&
      sameRankCriteria(rows[start], rows[end])
    ) {
      end++;
    }

    if (end - start > 1) {
      const spansCutLine =
        start < finalistCount && end > finalistCount;

      for (let i = start; i < end; i++) {
        rows[i].suddenDeathTie = true;
        rows[i].cutLineTie = spansCutLine;
        rows[i].whyRankedHere = spansCutLine
          ? "Exact tie spans the finalist cutoff. Review required."
          : "Exact tie on ranking criteria. Review required.";
      }
    }

    start = end;
  }

  return {
    settings,
    rows,
    totalTeams: rows.length,
    finalistCount,
    cutLineTie: rows.some((row) => row.cutLineTie),
  };
}
