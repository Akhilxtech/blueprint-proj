-- CreateTable
CREATE TABLE "round2_marks" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "questionNo" INTEGER NOT NULL,
    "marks" INTEGER NOT NULL,

    CONSTRAINT "round2_marks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "round2_marks_teamId_questionNo_key" ON "round2_marks"("teamId", "questionNo");

-- AddForeignKey
ALTER TABLE "round2_marks" ADD CONSTRAINT "round2_marks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Validate Round 2 question numbers and marks.
ALTER TABLE "round2_marks"
ADD CONSTRAINT "round2_marks_questionNo_check"
CHECK ("questionNo" BETWEEN 1 AND 10);

ALTER TABLE "round2_marks"
ADD CONSTRAINT "round2_marks_marks_check"
CHECK ("marks" BETWEEN 0 AND 10);

-- Seed default Round 2 settings without overwriting existing values.
INSERT INTO "settings" ("key", "value")
VALUES
  ('round2.weightRound1', '0.4'::jsonb),
  ('round2.weightRound2', '0.6'::jsonb),
  ('round2.finalistCount', '10'::jsonb)
ON CONFLICT ("key") DO NOTHING;
