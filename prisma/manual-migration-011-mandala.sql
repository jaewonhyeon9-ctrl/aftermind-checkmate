-- 2026-05-06: 만다라트 차트 (User에 JSONB 컬럼 추가)
-- 9x9 그리드: 중앙 3x3에 메인 목표 + 8개 하위 목표, 주변 8개 3x3에 각 목표의 액션 아이템

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mandalaChart" JSONB;
