-- CreateEnum
CREATE TYPE "QuizRunStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "TeamQuizStatus" AS ENUM ('ACTIVE', 'ELIMINATED');

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "eliminatedAt" TIMESTAMP(3),
ADD COLUMN     "isFinalist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "quizStatus" "TeamQuizStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "rulesAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "warningCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "quiz_runs" (
    "id" TEXT NOT NULL,
    "status" "QuizRunStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pausedMs" INTEGER NOT NULL DEFAULT 0,
    "skipMs" INTEGER NOT NULL DEFAULT 0,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_run_questions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "gapMs" INTEGER NOT NULL,

    CONSTRAINT "quiz_run_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_roster" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "quiz_roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseMs" INTEGER NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_run_questions_questionId_idx" ON "quiz_run_questions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_run_questions_runId_position_key" ON "quiz_run_questions"("runId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_run_questions_runId_questionId_key" ON "quiz_run_questions"("runId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_roster_teamId_key" ON "quiz_roster"("teamId");

-- CreateIndex
CREATE INDEX "responses_questionId_idx" ON "responses"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "responses_teamId_questionId_key" ON "responses"("teamId", "questionId");

-- CreateIndex
CREATE INDEX "teams_lastSeenAt_idx" ON "teams"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "quiz_run_questions" ADD CONSTRAINT "quiz_run_questions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "quiz_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_run_questions" ADD CONSTRAINT "quiz_run_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_roster" ADD CONSTRAINT "quiz_roster_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
