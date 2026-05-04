-- 2026-05-04: 팀 기여 / 수업 / 코인 시스템
-- Supabase SQL Editor에서 실행

-- ===== ENUMS =====
DO $$ BEGIN
  CREATE TYPE "ContributionType" AS ENUM ('SKILL', 'CLASS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ContributionStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CoinReason" AS ENUM ('ISSUE', 'TRANSFER', 'CONTRIBUTION_REWARD', 'CLASS_REWARD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== ContributionPost =====
-- 기여 가능 항목 (SKILL) 또는 수업 (CLASS)
CREATE TABLE IF NOT EXISTS "ContributionPost" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authorId"       TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type"           "ContributionType" NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "coinReward"     INTEGER NOT NULL DEFAULT 0,
  "maxApplicants"  INTEGER,
  "deadline"       TIMESTAMP(3),
  "status"         "ContributionStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "ContributionPost_type_status_idx" ON "ContributionPost"("type", "status");
CREATE INDEX IF NOT EXISTS "ContributionPost_authorId_idx" ON "ContributionPost"("authorId");

DO $$ BEGIN
  CREATE TRIGGER contribution_post_updated_at BEFORE UPDATE ON "ContributionPost"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== ContributionApplication =====
-- 기여 신청 / 수업 등록
CREATE TABLE IF NOT EXISTS "ContributionApplication" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId"      TEXT NOT NULL REFERENCES "ContributionPost"("id") ON DELETE CASCADE,
  "applicantId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "message"     TEXT,
  "status"      "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContributionApplication_postId_applicantId_key" UNIQUE ("postId", "applicantId")
);
CREATE INDEX IF NOT EXISTS "ContributionApplication_applicantId_idx" ON "ContributionApplication"("applicantId");
CREATE INDEX IF NOT EXISTS "ContributionApplication_postId_status_idx" ON "ContributionApplication"("postId", "status");

DO $$ BEGIN
  CREATE TRIGGER contribution_application_updated_at BEFORE UPDATE ON "ContributionApplication"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== CoinLedger =====
-- 코인 발행/송금/지급 통합 원장 (event-sourcing 스타일)
-- fromUserId == NULL → 시스템 발행 (무제한 발행 모드)
-- fromUserId != NULL → 사용자 송금 (잔액 차감)
CREATE TABLE IF NOT EXISTS "CoinLedger" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fromUserId"     TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "toUserId"       TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "amount"         INTEGER NOT NULL CHECK ("amount" > 0),
  "reason"         "CoinReason" NOT NULL,
  "memo"           TEXT,
  "relatedPostId"  TEXT REFERENCES "ContributionPost"("id") ON DELETE SET NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CoinLedger_toUserId_createdAt_idx" ON "CoinLedger"("toUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoinLedger_fromUserId_createdAt_idx" ON "CoinLedger"("fromUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoinLedger_createdAt_idx" ON "CoinLedger"("createdAt");
