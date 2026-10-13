import { prisma } from "../lib/db";

async function main() {
  const rows = await prisma.$queryRaw<
    { position: number; questionId: string; marks: number }[]
  >`
    SELECT
      qr."position",
      q."id" AS "questionId",
      q."marks"
    FROM "quiz_run_questions" qr
    INNER JOIN "questions" q
      ON q."id" = qr."questionId"
    WHERE qr."runId" = 'main'
    ORDER BY qr."position"
  `;

  console.table(rows);

  console.log("Total questions:", rows.length);
  console.log("All questions worth 1 mark:", rows.length > 0 && rows.every((q) => Number(q.marks) === 1));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
