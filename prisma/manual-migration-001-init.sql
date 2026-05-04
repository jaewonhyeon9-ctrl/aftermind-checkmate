-- 에프터마인드2기 체크메이트 — 초기 스키마
-- Supabase SQL Editor에서 실행
-- 실행 전 Auth → Email Provider 활성화 필요

-- ===== ENUMS =====
CREATE TYPE "UserRole" AS ENUM ('OPERATOR', 'MEMBER');
CREATE TYPE "AssignmentScope" AS ENUM ('ALL', 'INDIVIDUAL');

-- ===== User =====
CREATE TABLE "User" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authId"     TEXT NOT NULL UNIQUE,
  "email"      TEXT NOT NULL UNIQUE,
  "name"       TEXT NOT NULL,
  "role"       "UserRole" NOT NULL DEFAULT 'MEMBER',
  "kakaoPhone" TEXT,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL
);
CREATE INDEX "User_role_idx" ON "User"("role");

-- ===== DailyEntry =====
CREATE TABLE "DailyEntry" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "date"          DATE NOT NULL,
  "wakeUpTime"    TEXT,
  "workStartTime" TEXT,
  "smallWin"      TEXT,
  "insight"       TEXT,
  "morningPlan"   TEXT,
  "afternoonPlan" TEXT,
  "eveningPlan"   TEXT,
  "must3"         TEXT[] NOT NULL DEFAULT '{}',
  "nice3"         TEXT[] NOT NULL DEFAULT '{}',
  "variables"     TEXT,
  "oneThing"      TEXT,
  "cheerMessage"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyEntry_userId_date_key" UNIQUE ("userId", "date")
);
CREATE INDEX "DailyEntry_date_idx" ON "DailyEntry"("date");

-- ===== TimelineTask =====
CREATE TABLE "TimelineTask" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dailyEntryId" TEXT NOT NULL REFERENCES "DailyEntry"("id") ON DELETE CASCADE,
  "title"        TEXT NOT NULL,
  "startTime"    TEXT NOT NULL,
  "dueTime"      TEXT NOT NULL,
  "completedAt"  TIMESTAMP(3),
  "isOnTime"     BOOLEAN,
  "order"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TimelineTask_dailyEntryId_order_idx" ON "TimelineTask"("dailyEntryId", "order");

-- ===== MustCheck =====
CREATE TABLE "MustCheck" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dailyEntryId" TEXT NOT NULL REFERENCES "DailyEntry"("id") ON DELETE CASCADE,
  "mustIndex"    INTEGER NOT NULL,
  "mustText"     TEXT NOT NULL,
  "isCompleted"  BOOLEAN NOT NULL DEFAULT false,
  "reason"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MustCheck_dailyEntryId_mustIndex_key" UNIQUE ("dailyEntryId", "mustIndex")
);

-- ===== AssignedTask =====
CREATE TABLE "AssignedTask" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "creatorId"   TEXT NOT NULL REFERENCES "User"("id"),
  "scope"       "AssignmentScope" NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "dueDate"     TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AssignedTask_dueDate_idx" ON "AssignedTask"("dueDate");

-- ===== AssignedTaskCompletion =====
CREATE TABLE "AssignedTaskCompletion" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "taskId"      TEXT NOT NULL REFERENCES "AssignedTask"("id") ON DELETE CASCADE,
  "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AssignedTaskCompletion_taskId_userId_key" UNIQUE ("taskId", "userId")
);
CREATE INDEX "AssignedTaskCompletion_userId_isCompleted_idx" ON "AssignedTaskCompletion"("userId", "isCompleted");

-- ===== Auto-update updatedAt =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_updated_at BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER daily_entry_updated_at BEFORE UPDATE ON "DailyEntry"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER must_check_updated_at BEFORE UPDATE ON "MustCheck"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER assigned_task_updated_at BEFORE UPDATE ON "AssignedTask"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
