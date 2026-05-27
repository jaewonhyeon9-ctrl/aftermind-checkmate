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

// ============ 정기 지출 (RecurringExpense) ============

const recurringSchema = z.object({
  label: z.string().min(1).max(40),
  category: z.string().min(1).max(40),
  amount: z.number().int().nonnegative().max(2_000_000_000),
});

export async function addRecurringExpense(input: z.infer<typeof recurringSchema>) {
  const user = await requireUser();
  const parsed = recurringSchema.parse(input);

  const maxOrder = await prisma.recurringExpense.aggregate({
    where: { userId: user.id },
    _max: { sortOrder: true },
  });

  await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      label: parsed.label.trim(),
      category: parsed.category.trim(),
      amount: parsed.amount,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/money");
}

export async function deleteRecurringExpense(id: string) {
  const user = await requireUser();
  const r = await prisma.recurringExpense.findUnique({ where: { id } });
  if (!r || r.userId !== user.id) throw new Error("권한 없음");

  // 이 정기 지출로 발행된 거래도 함께 삭제 (cascade via RecurringCheck 의 transactionId 사용)
  const checks = await prisma.recurringCheck.findMany({
    where: { recurringExpenseId: id },
    select: { transactionId: true },
  });
  const txnIds = checks.map((c) => c.transactionId).filter((x): x is string => !!x);
  if (txnIds.length > 0) {
    await prisma.transaction.deleteMany({ where: { id: { in: txnIds } } });
  }
  await prisma.recurringExpense.delete({ where: { id } });

  revalidatePath("/money");
}

const toggleSchema = z.object({
  recurringExpenseId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * 정기 지출을 특정 날짜에 체크/해제 토글.
 * - 체크하면: Transaction 생성 + RecurringCheck 기록
 * - 해제하면: 둘 다 삭제
 */
export async function toggleRecurringCheck(input: z.infer<typeof toggleSchema>) {
  const user = await requireUser();
  const parsed = toggleSchema.parse(input);
  const recurring = await prisma.recurringExpense.findUnique({
    where: { id: parsed.recurringExpenseId },
  });
  if (!recurring || recurring.userId !== user.id) throw new Error("권한 없음");

  const dateObj = new Date(parsed.date + "T00:00:00.000Z");

  const existing = await prisma.recurringCheck.findUnique({
    where: {
      recurringExpenseId_date: {
        recurringExpenseId: parsed.recurringExpenseId,
        date: dateObj,
      },
    },
  });

  if (existing) {
    // 해제
    if (existing.transactionId) {
      await prisma.transaction.delete({ where: { id: existing.transactionId } }).catch(() => {});
    }
    await prisma.recurringCheck.delete({ where: { id: existing.id } });
  } else {
    // 체크 → 거래 생성
    const txn = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        category: recurring.category,
        amount: recurring.amount,
        date: dateObj,
        note: `[정기] ${recurring.label}`,
      },
    });
    await prisma.recurringCheck.create({
      data: {
        recurringExpenseId: parsed.recurringExpenseId,
        userId: user.id,
        date: dateObj,
        transactionId: txn.id,
      },
    });
  }

  revalidatePath("/money");
  revalidatePath("/today");
}

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
