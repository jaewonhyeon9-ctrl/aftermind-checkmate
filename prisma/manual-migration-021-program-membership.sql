-- 2026-07-03: 멀티 과정(Program) 지원 — Program / Membership 신설
-- 체크메이트를 여러 과정(에프터마인드, 1인기업가 과정 등)이 동시에 쓸 수 있게 함.
-- 순수 추가 마이그레이션 — 기존 테이블/코드는 무변경, 이 시점엔 앱 동작 변화 없음.

DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Program" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "slug"        TEXT NOT NULL UNIQUE,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Membership" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "programId" TEXT NOT NULL REFERENCES "Program"("id") ON DELETE CASCADE,
  "role"      "UserRole" NOT NULL DEFAULT 'MEMBER',
  "status"    "MembershipStatus" NOT NULL DEFAULT 'PENDING',
  "joinedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Membership_userId_programId_key" UNIQUE ("userId", "programId")
);

CREATE INDEX IF NOT EXISTS "Membership_programId_status_role_idx"
  ON "Membership" ("programId", "status", "role");
CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership" ("userId");

-- 백필: 기존 데이터 전체를 "에프터마인드 2기" 과정으로 감싼다.
-- 고정 UUID 사용 — 뒤이은 manual-migration-022가 동일 id로 기존 행을 채워야 하므로.
INSERT INTO "Program" ("id", "slug", "name", "description")
VALUES ('00000000-0000-0000-0000-000000000001', 'afterm-2', '에프터마인드 2기', '멀티 과정 전환 시 기존 데이터 백필로 생성됨')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Membership" ("userId", "programId", "role", "status")
SELECT "id", '00000000-0000-0000-0000-000000000001', "role", 'ACTIVE'
FROM "User"
ON CONFLICT ("userId", "programId") DO NOTHING;