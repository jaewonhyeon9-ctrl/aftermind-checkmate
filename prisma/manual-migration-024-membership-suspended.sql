-- 2026-07-06: Membership.status에 SUSPENDED 추가
-- "가입 거절(REJECTED)"과 "이미 활동하다 운영자가 비활성화한 팀원"을 하나의 상태로
-- 합쳐 쓰던 걸 분리한다 (toggleUserActive가 지금까지 REJECTED를 재사용하고 있었음).
-- 순수 추가 마이그레이션 — 기존 행에는 영향 없음, enum에 값 하나 추가만 함.

ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
