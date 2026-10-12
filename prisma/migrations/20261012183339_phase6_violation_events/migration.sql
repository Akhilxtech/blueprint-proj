-- Preserve existing violation records by renaming columns.
ALTER TABLE "tab_switch_violations"
RENAME COLUMN "eventId" TO "clientEventId";

ALTER TABLE "tab_switch_violations"
RENAME COLUMN "awayDurationMs" TO "durationMs";

-- Existing records do not have a start timestamp.
-- Use createdAt as a safe historical fallback.
ALTER TABLE "tab_switch_violations"
ADD COLUMN "startedAt" TIMESTAMP(3);

UPDATE "tab_switch_violations"
SET "startedAt" = "createdAt"
WHERE "startedAt" IS NULL;

ALTER TABLE "tab_switch_violations"
ALTER COLUMN "startedAt" SET NOT NULL;

-- Rename the existing unique index to match the new field.
ALTER INDEX "tab_switch_violations_eventId_key"
RENAME TO "tab_switch_violations_clientEventId_key";