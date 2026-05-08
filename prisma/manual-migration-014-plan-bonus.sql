-- 2026-05-07: 전날 미리 계획 완성 보상 (300 코인)
-- DailyEntry.planBonusAt = 보상 지급 시각. NULL이면 미지급.
ALTER TABLE "DailyEntry"
  ADD COLUMN IF NOT EXISTS "planBonusAt" TIMESTAMP(3);
