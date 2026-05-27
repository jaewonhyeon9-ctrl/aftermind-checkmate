-- 2026-05-27: 카카오톡 채널별 토글 추가
-- 사용자들이 가계부 요약, 오늘 일정도 카톡으로 받고 싶다는 요청.

ALTER TABLE "KakaoIntegration"
  ADD COLUMN IF NOT EXISTS "moneyEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "todayPlanEnabled" BOOLEAN NOT NULL DEFAULT true;
