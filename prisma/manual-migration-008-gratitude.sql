-- 2026-04-29: DailyEntry에 감사한 점 필드 추가
ALTER TABLE "DailyEntry" ADD COLUMN IF NOT EXISTS "gratitude" TEXT;
