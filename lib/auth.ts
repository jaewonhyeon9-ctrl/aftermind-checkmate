import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let user = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  // 자동 부트스트랩: auth는 됐는데 User row가 없는 경우 (회원가입 직후 등)
  if (!user) {
    const name =
      (authUser.user_metadata?.name as string | undefined)?.trim() ||
      authUser.email?.split("@")[0] ||
      "팀원";

    user = await prisma.user.upsert({
      where: { authId: authUser.id },
      create: {
        authId: authUser.id,
        email: authUser.email ?? "",
        name,
      },
      update: {},
    });
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type ProgramContext = { id: string; slug: string };

/** 과정 소속(멤버십) 여부만 확인 — 없거나 승인 대기/거절 상태면 /join/[slug]로 보낸다. */
export async function requireMembership(program: ProgramContext) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_programId: { userId: user.id, programId: program.id } },
  });

  if (!membership || membership.status !== "ACTIVE") {
    redirect(`/join/${program.slug}`);
  }

  return { user, membership };
}

/** 이 과정의 운영자인지 확인 — 아니면 해당 과정 홈으로 되돌린다. */
export async function requireOperator(program: ProgramContext) {
  const { user, membership } = await requireMembership(program);
  if (membership.role !== "OPERATOR") {
    redirect("/today");
  }
  return { user, membership };
}

/** 이 유저가 (승인 여부와 무관하게) 어떤 과정에서든 OPERATOR인지 — /programs/new 진입 가능 여부 판단용. */
export async function isOperatorAnywhere(userId: string) {
  const count = await prisma.membership.count({
    where: { userId, role: "OPERATOR", status: "ACTIVE" },
  });
  return count > 0;
}