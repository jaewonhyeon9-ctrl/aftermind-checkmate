-- 2026-05-27: 매시간 정각 체크인 기능
-- 팀원들이 매시간 사진+짧은 글(인스타 스타일 오버레이)로 현재 상황을 공유.

CREATE TABLE IF NOT EXISTS "HourlyCheckin" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "hour"      TIMESTAMPTZ NOT NULL,
  "photoUrl"  TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "HourlyCheckin_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "HourlyCheckin_userId_hour_key"
  ON "HourlyCheckin" ("userId", "hour");

CREATE INDEX IF NOT EXISTS "HourlyCheckin_hour_idx"
  ON "HourlyCheckin" ("hour");

-- 체크인 알림 발송 시간대 설정 (싱글톤)
CREATE TABLE IF NOT EXISTS "CheckinConfig" (
  "id"        INTEGER PRIMARY KEY DEFAULT 1,
  "enabled"   BOOLEAN NOT NULL DEFAULT true,
  "startHour" INTEGER NOT NULL DEFAULT 9,
  "endHour"   INTEGER NOT NULL DEFAULT 22,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CheckinConfig_single_row" CHECK ("id" = 1)
);

INSERT INTO "CheckinConfig" ("id", "enabled", "startHour", "endHour")
VALUES (1, true, 9, 22)
ON CONFLICT ("id") DO NOTHING;
