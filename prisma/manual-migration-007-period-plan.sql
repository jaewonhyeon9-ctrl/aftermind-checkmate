-- 2026-04-29: 주간/월간/연간 계획
DO $$ BEGIN
  CREATE TYPE "PlanScope" AS ENUM ('WEEK', 'MONTH', 'YEAR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PeriodPlan" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "scope"     "PlanScope" NOT NULL,
  "periodKey" TEXT NOT NULL,
  "content"   TEXT,
  "goals"     TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeriodPlan_userId_scope_periodKey_key" UNIQUE ("userId", "scope", "periodKey")
);
CREATE INDEX IF NOT EXISTS "PeriodPlan_scope_periodKey_idx" ON "PeriodPlan"("scope", "periodKey");

-- updatedAt 자동 갱신 트리거
DO $$ BEGIN
  CREATE TRIGGER period_plan_updated_at BEFORE UPDATE ON "PeriodPlan"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
