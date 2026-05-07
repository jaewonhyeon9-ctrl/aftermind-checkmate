-- 2026-05-06: KakaoIntegration 테이블 추가
-- 사용자가 카카오 OAuth로 연동하여 매일 리마인드를 카카오톡 "나에게 보내기"로 받기 위함

CREATE TABLE IF NOT EXISTS "KakaoIntegration" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "kakaoId" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "dailyReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "KakaoIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "KakaoIntegration_userId_idx" ON "KakaoIntegration" ("userId");
