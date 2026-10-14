-- CreateTable
CREATE TABLE "problem_statements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "deliverables" TEXT NOT NULL,
    "maxTeams" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_hints" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "statement_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_selections" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "resetCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "team_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "problem_statements_enabled_displayOrder_idx" ON "problem_statements"("enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "statement_hints_statementId_idx" ON "statement_hints"("statementId");

-- CreateIndex
CREATE UNIQUE INDEX "statement_hints_statementId_order_key" ON "statement_hints"("statementId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "team_selections_teamId_key" ON "team_selections"("teamId");

-- CreateIndex
CREATE INDEX "team_selections_statementId_idx" ON "team_selections"("statementId");

-- CreateIndex
CREATE INDEX "team_selections_selectedAt_idx" ON "team_selections"("selectedAt");

-- AddForeignKey
ALTER TABLE "statement_hints" ADD CONSTRAINT "statement_hints_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "problem_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_selections" ADD CONSTRAINT "team_selections_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_selections" ADD CONSTRAINT "team_selections_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "problem_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
