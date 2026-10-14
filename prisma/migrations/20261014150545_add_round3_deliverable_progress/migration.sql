-- CreateTable
CREATE TABLE "team_deliverable_progress" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "deliverableIndex" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_deliverable_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_deliverable_progress_teamId_statementId_idx" ON "team_deliverable_progress"("teamId", "statementId");

-- CreateIndex
CREATE UNIQUE INDEX "team_deliverable_progress_teamId_statementId_deliverableInd_key" ON "team_deliverable_progress"("teamId", "statementId", "deliverableIndex");

-- AddForeignKey
ALTER TABLE "team_deliverable_progress" ADD CONSTRAINT "team_deliverable_progress_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_deliverable_progress" ADD CONSTRAINT "team_deliverable_progress_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "problem_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
