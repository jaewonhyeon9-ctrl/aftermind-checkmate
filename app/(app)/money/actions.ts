"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const txnSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1).max(40),
  amount: z.number().int().nonnegative().max(2_000_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).nullable(),
});

export async function addTransaction(input: z.infer<typeof txnSchema>) {
  const user = await requireUser();
  const parsed = txnSchema.parse(input);
  const date = new Date(parsed.date + "T00:00:00.000Z");

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: parsed.type,
      category: parsed.category.trim(),
      amount: parsed.amount,
      date,
      note: parsed.note?.trim() || null,
    },
  });

  revalidatePath("/money");
  revalidatePath("/today");
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  const t = await prisma.transaction.findUnique({ where: { id } });
  if (!t || t.userId !== user.id) throw new Error("권한 없음");
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/money");
  revalidatePath("/today");
}

const updateSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1).max(40),
  amount: z.number().int().nonnegative().max(2_000_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).nullable(),
});

export async function updateTransaction(input: z.infer<typeof updateSchema>) {
  const user = await requireUser();
  const parsed = updateSchema.parse(input);
  const t = await prisma.transaction.findUnique({ where: { id: parsed.id } });
  if (!t || t.userId !== user.id) throw new Error("권한 없음");

  await prisma.transaction.update({
    where: { id: parsed.id },
    data: {
      type: parsed.type,
      category: parsed.category.trim(),
      amount: parsed.amount,
      date: new Date(parsed.date + "T00:00:00.000Z"),
      note: parsed.note?.trim() || null,
    },
  });

  revalidatePath("/money");
  revalidatePath("/today");
}

const bulkSchema = z.object({
  items: z
    .array(
      z.object({
        type: z.enum(["INCOME", "EXPENSE"]),
        category: z.string().min(1).max(40),
        amount: z.number().int().nonnegative().max(2_000_000_000),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        note: z.string().max(200).nullable(),
      })
    )
    .max(200),
});

export async function bulkImportTransactions(input: z.infer<typeof bulkSchema>) {
  const user = await requireUser();
  const parsed = bulkSchema.parse(input);
  if (parsed.items.length === 0) return { created: 0 };

  const created = await prisma.transaction.createMany({
    data: parsed.items.map((i) => ({
      userId: user.id,
      type: i.type,
      category: i.category.trim(),
      amount: i.amount,
      date: new Date(i.date + "T00:00:00.000Z"),
      note: i.note?.trim() || null,
    })),
  });

  revalidatePath("/money");
  revalidatePath("/today");
  return { created: created.count };
}
