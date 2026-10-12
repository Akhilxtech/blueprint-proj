-- CreateTable
CREATE TABLE "tab_switch_violations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "awayDurationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tab_switch_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tab_switch_violations_eventId_key" ON "tab_switch_violations"("eventId");

-- CreateIndex
CREATE INDEX "tab_switch_violations_teamId_createdAt_idx" ON "tab_switch_violations"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "tab_switch_violations" ADD CONSTRAINT "tab_switch_violations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
