"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TIMEZONE_OPTIONS } from "@/lib/dates";

const validTimezones = TIMEZONE_OPTIONS.map((t) => t.value);

const profileSchema = z.object({
  name: z.string().min(1).max(40),
  finalGoal: z.string().max(500).nullable(),
  timezone: z.string().refine((v) => validTimezones.includes(v), {
    message: "지원하지 않는 시간대",
  }),
});

export async function updateMyProfile(input: z.infer<typeof profileSchema>) {
  const me = await requireUser();
  const parsed = profileSchema.parse(input);

  await prisma.user.update({
    where: { id: me.id },
    data: {
      name: parsed.name.trim(),
      finalGoal: parsed.finalGoal?.trim() || null,
      timezone: parsed.timezone,
    },
  });

  revalidatePath("/me");
  revalidatePath("/today");
  revalidatePath("/feed");
  revalidatePath("/operator");
}

const mandalaSchema = z.object({
  center: z.string().max(80),
  goals: z
    .array(
      z.object({
        title: z.string().max(40),
        actions: z.array(z.string().max(40)).length(8),
      })
    )
    .length(8),
});

export type MandalaData = z.infer<typeof mandalaSchema>;

export async function updateMandala(input: MandalaData) {
  const me = await requireUser();
  const parsed = mandalaSchema.parse(input);
  await prisma.user.update({
    where: { id: me.id },
    data: { mandalaChart: parsed },
  });
  revalidatePath("/me");
}
