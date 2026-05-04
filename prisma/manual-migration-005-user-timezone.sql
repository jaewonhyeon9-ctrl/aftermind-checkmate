-- 2026-04-29: User에 timezone 컬럼 추가 (국가별 시각 설정용)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul';
