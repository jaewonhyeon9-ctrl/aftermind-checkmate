-- 정리 마이그레이션 — PR-2(멀티 과정 라우팅/인가 컷오버) 배포가 충분히 안정화된 뒤에만 실행할 것.
-- 코드가 더 이상 User.role을 읽지 않는 게 확인된 후 실행 (role은 이제 Membership.role로 완전히 대체됨).
-- 아직 실행하지 말 것 — PR-1/PR-2 배포 전 단계에서는 User.role이 여전히 lib/auth.ts, register API 등에서 읽힘.

ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
DROP INDEX IF EXISTS "User_role_idx";
-- UserRole enum 자체는 유지 (Membership.role이 계속 사용).