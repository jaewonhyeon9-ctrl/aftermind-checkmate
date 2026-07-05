"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createProgramSchema = z.object({
  name: z.string().min(1).max(60),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "URL 코드는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요"),
});

/** 새 과정(팀)을 만들고 만든 사람을 그 과정의 OPERATOR로 등록한다. */
export async function createProgram(input: z.infer<typeof createProgramSchema>) {
  const user = await requireUser();
  const parsed = createProgramSchema.parse(input);

  const existing = await prisma.program.findUnique({ where: { slug: parsed.slug } });
  if (existing) throw new Error("이미 사용 중인 URL 코드예요. 다른 코드를 입력해주세요");

  await prisma.$transaction(async (tx) => {
    const program = await tx.program.create({
      data: { slug: parsed.slug, name: parsed.name.trim() },
    });
    await tx.membership.create({
      data: { userId: user.id, programId: program.id, role: "OPERATOR", status: "ACTIVE" },
    });
  });
}
