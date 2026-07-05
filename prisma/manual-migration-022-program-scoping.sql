-- 2026-07-03: 멀티 과정(Program) 지원 — 기존 운영 데이터에 programId 스코프 추가
-- 021에서 백필된 "에프터마인드 2기"(id=00000000-0000-0000-0000-000000000001)로
-- 기존 행을 채운 뒤 NOT NULL로 잠근다. 이 마이그레이션은 반드시 코드 컷오버(PR-2) 배포 전에 실행한다.

DO $$
DECLARE legacy_program_id TEXT := '00000000-0000-0000-0000-000000000001';
BEGIN

-- ===== DailyEntry =====
ALTER TABLE "DailyEntry" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "DailyEntry" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "DailyEntry" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT;
ALTER TABLE "DailyEntry" DROP CONSTRAINT IF EXISTS "DailyEntry_userId_date_key";
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_programId_date_key"
  UNIQUE ("userId", "programId", "date");
DROP INDEX IF EXISTS "DailyEntry_date_idx";
CREATE INDEX IF NOT EXISTS "DailyEntry_programId_date_idx" ON "DailyEntry" ("programId", "date");

-- ===== AssignedTask =====
ALTER TABLE "AssignedTask" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "AssignedTask" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "AssignedTask" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "AssignedTask" ADD CONSTRAINT "AssignedTask_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT;
DROP INDEX IF EXISTS "AssignedTask_dueDate_idx";
CREATE INDEX IF NOT EXISTS "AssignedTask_programId_dueDate_idx" ON "AssignedTask" ("programId", "dueDate");

-- ===== PeriodPlan =====
ALTER TABLE "PeriodPlan" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "PeriodPlan" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "PeriodPlan" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "PeriodPlan" ADD CONSTRAINT "PeriodPlan_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT;
ALTER TABLE "PeriodPlan" DROP CONSTRAINT IF EXISTS "PeriodPlan_userId_scope_periodKey_key";
ALTER TABLE "PeriodPlan" ADD CONSTRAINT "PeriodPlan_userId_programId_scope_periodKey_key"
  UNIQUE ("userId", "programId", "scope", "periodKey");

-- ===== ContributionPost =====
ALTER TABLE "ContributionPost" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "ContributionPost" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "ContributionPost" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "ContributionPost" ADD CONSTRAINT "ContributionPost_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT;
DROP INDEX IF EXISTS "ContributionPost_type_status_idx";
CREATE INDEX IF NOT EXISTS "ContributionPost_programId_type_status_idx"
  ON "ContributionPost" ("programId", "type", "status");

-- ===== CoinLedger =====
ALTER TABLE "CoinLedger" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "CoinLedger" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "CoinLedger" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "CoinLedger" ADD CONSTRAINT "CoinLedger_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT;
DROP INDEX IF EXISTS "CoinLedger_toUserId_createdAt_idx";
DROP INDEX IF EXISTS "CoinLedger_fromUserId_createdAt_idx";
DROP INDEX IF EXISTS "CoinLedger_createdAt_idx";
CREATE INDEX IF NOT EXISTS "CoinLedger_programId_toUserId_createdAt_idx"
  ON "CoinLedger" ("programId", "toUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoinLedger_programId_fromUserId_createdAt_idx"
  ON "CoinLedger" ("programId", "fromUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoinLedger_programId_createdAt_idx"
  ON "CoinLedger" ("programId", "createdAt");

-- ===== HourlyCheckin =====
ALTER TABLE "HourlyCheckin" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "HourlyCheckin" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "HourlyCheckin" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "HourlyCheckin" ADD CONSTRAINT "HourlyCheckin_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT;
DROP INDEX IF EXISTS "HourlyCheckin_userId_hour_key";
CREATE UNIQUE INDEX IF NOT EXISTS "HourlyCheckin_userId_programId_hour_key"
  ON "HourlyCheckin" ("userId", "programId", "hour");
DROP INDEX IF EXISTS "HourlyCheckin_hour_idx";
CREATE INDEX IF NOT EXISTS "HourlyCheckin_programId_hour_idx" ON "HourlyCheckin" ("programId", "hour");

-- ===== Announcement =====
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "Announcement" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "Announcement" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT;
DROP INDEX IF EXISTS "Announcement_pinned_createdAt_idx";
CREATE INDEX IF NOT EXISTS "Announcement_programId_pinned_createdAt_idx"
  ON "Announcement" ("programId", "pinned", "createdAt");

-- ===== CheckinConfig — 싱글톤(id=1) → 과정별 1행 =====
ALTER TABLE "CheckinConfig" DROP CONSTRAINT IF EXISTS "CheckinConfig_single_row";
ALTER TABLE "CheckinConfig" ADD COLUMN IF NOT EXISTS "programId" TEXT;
UPDATE "CheckinConfig" SET "programId" = legacy_program_id WHERE "programId" IS NULL;
ALTER TABLE "CheckinConfig" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "CheckinConfig" ADD CONSTRAINT "CheckinConfig_programId_key" UNIQUE ("programId");
ALTER TABLE "CheckinConfig" ADD CONSTRAINT "CheckinConfig_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE;

-- id를 Prisma의 autoincrement()가 기대하는 시퀀스 기반 컬럼으로 전환 (기존엔 상수 1 고정)
CREATE SEQUENCE IF NOT EXISTS "CheckinConfig_id_seq" OWNED BY "CheckinConfig"."id";
PERFORM setval('"CheckinConfig_id_seq"', GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "CheckinConfig"), 1));
ALTER TABLE "CheckinConfig" ALTER COLUMN "id" SET DEFAULT nextval('"CheckinConfig_id_seq"');

END $$;