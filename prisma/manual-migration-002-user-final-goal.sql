-- 2026-04-28: User에 에프터마인드 2기 최종 목표 필드 추가
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "finalGoal" TEXT;
