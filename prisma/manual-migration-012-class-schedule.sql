-- 2026-05-06: 수업 일정 (강의자가 정하는 시간) + 조율 메모
ALTER TABLE "ContributionPost"
  ADD COLUMN IF NOT EXISTS "scheduledAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scheduleNote" TEXT;
