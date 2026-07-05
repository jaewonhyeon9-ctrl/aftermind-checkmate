import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type ProgramContext = { id: string; slug: string; name: string };

/**
 * 유저의 '현재 과정' 멤버십 — 가장 최근 가입한 ACTIVE 멤버십 하나를 고른다.
 * 여러 과정에 속해도 하나만 고른다 (과정 전환 UI는 이번 범위 밖 — /today 등 URL은 과정 세그먼트 없이 그대로 유지).
 */
export async function getCurrentMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { joinedAt: "desc" },
    include: { program: { select: { id: true, slug: true, name: true } } },
  });
}

export async function getCurrentProgram(userId: string): Promise<ProgramContext | null> {
  const membership = await getCurrentMembership(userId);
  return membership?.program ?? null;
}

/** 로그인 + '현재 과정' 멤버십 확인 (role 포함). 과정이 없으면 새 과정 만들기 페이지로 보낸다. */
async function requireUserWithMembership() {
  const user = await requireUser();
  const membership = await getCurrentMembership(user.id);
  if (!membership) redirect("/programs/new");
  return { user, membership };
}

/** 로그인 + '현재 과정' 확인. 과정이 없으면 새 과정 만들기 페이지로 보낸다. */
export async function requireUserWithProgram() {
  const { user, membership } = await requireUserWithMembership();
  return { user, program: membership.program };
}

/** 위와 동일 + 그 과정의 운영자인지 확인. 아니면 /today로 되돌린다. */
export async function requireOperatorWithProgram() {
  const { user, membership } = await requireUserWithMembership();
  if (membership.role !== "OPERATOR") redirect("/today");
  return { user, program: membership.program, membership };
}

/** 이 과정의 ACTIVE 멤버 userId 목록 (전체 브로드캐스트/과제 부여 대상 선정용). */
export async function getActiveProgramMemberIds(programId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { programId, status: "ACTIVE" },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}

/** 주어진 userId가 이 과정의 ACTIVE 멤버인지 확인. */
export async function isActiveMember(userId: string, programId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_programId: { userId, programId } },
    select: { status: true },
  });
  return membership?.status === "ACTIVE";
}

/** 활성 과정의 ACTIVE 멤버 중 푸시 구독이 있는 유저 — cron 라우트들이 공통으로 재사용. */
export async function getActivePushableMemberships() {
  return prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      program: { isActive: true },
      user: { isActive: true, pushSubscriptions: { some: {} } },
    },
    select: {
      userId: true,
      programId: true,
      user: { select: { name: true, timezone: true } },
    },
  });
}
