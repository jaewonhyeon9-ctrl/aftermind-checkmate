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
