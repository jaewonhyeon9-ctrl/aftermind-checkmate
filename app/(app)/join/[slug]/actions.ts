"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** 이 과정에 가입 신청(PENDING)한다. 운영자 승인 전까지는 이용할 수 없다. */
export async function requestJoin(programId: string) {
  const user = await requireUser();
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || !program.isActive) throw new Error("존재하지 않는 팀이에요");

  await prisma.membership.upsert({
    where: { userId_programId: { userId: user.id, programId } },
    create: { userId: user.id, programId, role: "MEMBER", status: "PENDING" },
    update: {},
  });
}
