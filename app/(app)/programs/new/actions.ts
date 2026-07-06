"use server";

import { Prisma } from "@prisma/client";
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

const DUPLICATE_SLUG_ERROR = "이미 사용 중인 URL 코드예요. 다른 코드를 입력해주세요";

type CreateProgramResult = { ok: true } | { ok: false; error: string };

/**
 * 새 과정(팀)을 만들고 만든 사람을 그 과정의 OPERATOR로 등록한다.
 * 이 Next 버전은 프로덕션에서 Server Function이 throw한 에러 메시지를 클라이언트로
 * 그대로 넘기지 않고 리다트하므로, 예상 가능한 실패는 throw 대신 반환값으로 알린다.
 */
export async function createProgram(
  input: z.infer<typeof createProgramSchema>
): Promise<CreateProgramResult> {
  const user = await requireUser();

  const parsed = createProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요" };
  }

  const existing = await prisma.program.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { ok: false, error: DUPLICATE_SLUG_ERROR };

  try {
    await prisma.$transaction(async (tx) => {
      const program = await tx.program.create({
        data: { slug: parsed.data.slug, name: parsed.data.name.trim() },
      });
      await tx.membership.create({
        data: { userId: user.id, programId: program.id, role: "OPERATOR", status: "ACTIVE" },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: DUPLICATE_SLUG_ERROR };
    }
    throw e;
  }

  return { ok: true };
}
