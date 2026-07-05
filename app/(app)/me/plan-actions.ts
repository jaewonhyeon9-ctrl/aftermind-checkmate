"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserWithProgram } from "@/lib/program";

const planSchema = z.object({
  scope: z.enum(["WEEK", "MONTH", "YEAR"]),
  periodKey: z.string().min(1).max(20),
  content: z.string().max(2000).nullable(),
  goals: z.array(z.string().max(120)).max(20).default([]),
});

export async function upsertPeriodPlan(input: z.infer<typeof planSchema>) {
  const { user, program } = await requireUserWithProgram();
  const parsed = planSchema.parse(input);

  const goals = parsed.goals.map((g) => g.trim()).filter(Boolean);

  await prisma.periodPlan.upsert({
    where: {
      userId_programId_scope_periodKey: {
        userId: user.id,
        programId: program.id,
        scope: parsed.scope,
        periodKey: parsed.periodKey,
      },
    },
    create: {
      userId: user.id,
      programId: program.id,
      scope: parsed.scope,
      periodKey: parsed.periodKey,
      content: parsed.content?.trim() || null,
      goals,
    },
    update: {
      content: parsed.content?.trim() || null,
      goals,
    },
  });

  revalidatePath("/me");
}
