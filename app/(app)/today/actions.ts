"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { todayInTz } from "@/lib/dates";
import { issueCoin } from "@/lib/coin";

const PLAN_BONUS_AMOUNT = 300;

const timelinePlanItemSchema = z.object({
  title: z.string().min(1).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wakeUpTime: z.string().nullable(),
  workStartTime: z.string().nullable(),
  smallWin: z.string().nullable(),
  insight: z.string().nullable(),
  gratitude: z.string().nullable(),
  must3: z.array(z.string()).max(3),
  nice3: z.array(z.string()).max(3),
  variables: z.string().nullable(),
  oneThing: z.string().nullable(),
  cheerMessage: z.string().nullable(),
  // timeline 필드를 보내지 않으면(undefined) 타임라인 동기화 자체를 건너뜀.
  // /today 페이지처럼 별도의 Timeline 컴포넌트가 직접 DB를 관리하는 경우 사용.
  timeline: z.array(timelinePlanItemSchema).optional(),
});

export type DailyEntryInput = z.infer<typeof dailyEntrySchema>;

export async function saveDailyEntry(input: DailyEntryInput) {
  const user = await requireUser();
  const parsed = dailyEntrySchema.parse(input);

  const date = new Date(parsed.date + "T00:00:00.000Z");
  const cleanArray = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);
  const must3 = cleanArray(parsed.must3);
  const nice3 = cleanArray(parsed.nice3);

  const entry = await prisma.$transaction(async (tx) => {
    const e = await tx.dailyEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: {
        userId: user.id,
        date,
        wakeUpTime: parsed.wakeUpTime,
        workStartTime: parsed.workStartTime,
        smallWin: parsed.smallWin,
        insight: parsed.insight,
        gratitude: parsed.gratitude,
        must3,
        nice3,
        variables: parsed.variables,
        oneThing: parsed.oneThing,
        cheerMessage: parsed.cheerMessage,
      },
      update: {
        wakeUpTime: parsed.wakeUpTime,
        workStartTime: parsed.workStartTime,
        smallWin: parsed.smallWin,
        insight: parsed.insight,
        gratitude: parsed.gratitude,
        must3,
        nice3,
        variables: parsed.variables,
        oneThing: parsed.oneThing,
        cheerMessage: parsed.cheerMessage,
      },
    });

    // Must 3 체크 row 동기화: 새 must3 텍스트로 업데이트, 사라진 인덱스는 삭제,
    // 기존 isCompleted/memo/reason는 보존
    const existingChecks = await tx.mustCheck.findMany({
      where: { dailyEntryId: e.id },
      orderBy: { mustIndex: "asc" },
    });
    const existingByIdx = new Map(existingChecks.map((c) => [c.mustIndex, c]));

    // 사라진 인덱스 삭제
    const validIndexes = new Set(must3.map((_, i) => i));
    const toDelete = existingChecks.filter((c) => !validIndexes.has(c.mustIndex));
    if (toDelete.length > 0) {
      await tx.mustCheck.deleteMany({
        where: { id: { in: toDelete.map((c) => c.id) } },
      });
    }

    // 추가 또는 텍스트 업데이트
    for (let i = 0; i < must3.length; i++) {
      const existing = existingByIdx.get(i);
      if (existing) {
        if (existing.mustText !== must3[i]) {
          await tx.mustCheck.update({
            where: { id: existing.id },
            data: { mustText: must3[i] },
          });
        }
      } else {
        await tx.mustCheck.create({
          data: { dailyEntryId: e.id, mustIndex: i, mustText: must3[i] },
        });
      }
    }

    // 타임라인은 폼이 명시적으로 보낼 때만 동기화.
    // /today에서는 Timeline 컴포넌트가 직접 관리하므로 폼은 timeline을 보내지 않음.
    if (parsed.timeline !== undefined) {
      const existing = await tx.timelineTask.findMany({
        where: { dailyEntryId: e.id },
        orderBy: { order: "asc" },
      });
      const completed = existing.filter((t) => t.completedAt !== null);
      const completedKey = (t: { title: string; startTime: string; dueTime: string }) =>
        `${t.title}|${t.startTime}|${t.dueTime}`;
      const completedSet = new Set(completed.map(completedKey));

      // 미완료 모두 삭제
      await tx.timelineTask.deleteMany({
        where: { dailyEntryId: e.id, completedAt: null },
      });

      // 새 계획에서 완료된 거 제외하고 (이미 보존됨) 나머지만 생성
      const toCreate = parsed.timeline.filter((t) => !completedSet.has(completedKey(t)));

      if (toCreate.length > 0) {
        const startOrder = completed.length;
        await tx.timelineTask.createMany({
          data: toCreate.map((t, i) => ({
            dailyEntryId: e.id,
            title: t.title,
            startTime: t.startTime,
            dueTime: t.dueTime,
            order: startOrder + i,
          })),
        });
      }
    }

    return e;
  });

  // 전날 미리 계획 완성 보상 — 내일 날짜의 entry를 오늘 자정 이전에 핵심 항목 모두 채워서 저장 시
  // 사용자 timezone 기준 today < parsed.date면 "미래 날짜에 대한 plan"으로 간주
  const tz = user.timezone || "Asia/Seoul";
  const todayStr = todayInTz(tz);
  let planBonusAwarded = false;
  if (
    parsed.date > todayStr &&
    !entry.planBonusAt &&
    isPlanComplete({
      wakeUpTime: parsed.wakeUpTime,
      must3,
      nice3,
      oneThing: parsed.oneThing,
      timelineCount: parsed.timeline?.length ?? 0,
    })
  ) {
    // 보상 지급 + 플래그 마크 — 동시 호출 방어를 위해 updateMany + 조건
    const flagged = await prisma.dailyEntry.updateMany({
      where: { id: entry.id, planBonusAt: null },
      data: { planBonusAt: new Date() },
    });
    if (flagged.count > 0) {
      try {
        await issueCoin({
          toUserId: user.id,
          amount: PLAN_BONUS_AMOUNT,
          memo: `${parsed.date} 계획 완성 보상 (전날 미리)`,
        });
        planBonusAwarded = true;
      } catch {
        // 코인 발행 실패 시 플래그 롤백 (재시도 가능하게)
        await prisma.dailyEntry.update({
          where: { id: entry.id },
          data: { planBonusAt: null },
        }).catch(() => {});
      }
    }
  }

  revalidatePath("/today");
  revalidatePath("/feed");
  revalidatePath("/me");
  revalidatePath("/team/coin");
  return { ...entry, planBonusAwarded };
}

/** 핵심 항목이 다 채워졌는지 검사 (전날 미리 보상 조건). */
function isPlanComplete(input: {
  wakeUpTime: string | null;
  must3: string[];
  nice3: string[];
  oneThing: string | null;
  timelineCount: number;
}): boolean {
  if (!input.wakeUpTime?.trim()) return false;
  if (input.must3.length !== 3 || input.must3.some((s) => !s.trim())) return false;
  if (input.nice3.length !== 3 || input.nice3.some((s) => !s.trim())) return false;
  if (!input.oneThing?.trim()) return false;
  if (input.timelineCount < 1) return false;
  return true;
}

const timelineTaskSchema = z.object({
  dailyEntryId: z.string().uuid(),
  title: z.string().min(1).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function addTimelineTask(input: z.infer<typeof timelineTaskSchema>) {
  const user = await requireUser();
  const parsed = timelineTaskSchema.parse(input);

  const entry = await prisma.dailyEntry.findUnique({
    where: { id: parsed.dailyEntryId },
    select: { userId: true },
  });
  if (!entry || entry.userId !== user.id) throw new Error("권한 없음");

  const last = await prisma.timelineTask.findFirst({
    where: { dailyEntryId: parsed.dailyEntryId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await prisma.timelineTask.create({
    data: {
      dailyEntryId: parsed.dailyEntryId,
      title: parsed.title,
      startTime: parsed.startTime,
      dueTime: parsed.dueTime,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath("/today");
  return task;
}

export async function completeTimelineTask(taskId: string) {
  const user = await requireUser();

  const task = await prisma.timelineTask.findUnique({
    where: { id: taskId },
    include: { dailyEntry: { select: { userId: true, date: true } } },
  });
  if (!task || task.dailyEntry.userId !== user.id) throw new Error("권한 없음");

  // 마감 시간 안에 완료했는지 — 사용자 timezone 기준
  const now = new Date();
  const tz = user.timezone || "Asia/Seoul";
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const nowHHMM = fmt.format(now); // "HH:MM"

  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const nowDate = dateFmt.format(now); // "YYYY-MM-DD"
  const entryDate = task.dailyEntry.date.toISOString().slice(0, 10);

  let isOnTime: boolean;
  if (nowDate < entryDate) {
    // 아직 entry의 날짜에 도달 안 함 → 미리 체크 — 온타임으로 처리
    isOnTime = true;
  } else if (nowDate > entryDate) {
    // 그 날짜 이후 → 지각
    isOnTime = false;
  } else {
    // 같은 날 — HH:MM 비교
    isOnTime = nowHHMM <= task.dueTime;
  }

  const updated = await prisma.timelineTask.update({
    where: { id: taskId },
    data: { completedAt: now, isOnTime },
  });

  revalidatePath("/today");
  revalidatePath("/feed");
  revalidatePath("/me");
  return { task: updated, isOnTime };
}

export async function uncompleteTimelineTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.timelineTask.findUnique({
    where: { id: taskId },
    include: { dailyEntry: { select: { userId: true } } },
  });
  if (!task || task.dailyEntry.userId !== user.id) throw new Error("권한 없음");

  await prisma.timelineTask.update({
    where: { id: taskId },
    data: { completedAt: null, isOnTime: null },
  });

  revalidatePath("/today");
  revalidatePath("/feed");
  revalidatePath("/me");
}

export async function deleteTimelineTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.timelineTask.findUnique({
    where: { id: taskId },
    include: { dailyEntry: { select: { userId: true } } },
  });
  if (!task || task.dailyEntry.userId !== user.id) throw new Error("권한 없음");

  await prisma.timelineTask.delete({ where: { id: taskId } });
  revalidatePath("/today");
  revalidatePath("/feed");
}

const updateTimelineSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function updateTimelineTask(input: z.infer<typeof updateTimelineSchema>) {
  const user = await requireUser();
  const parsed = updateTimelineSchema.parse(input);
  const task = await prisma.timelineTask.findUnique({
    where: { id: parsed.taskId },
    include: { dailyEntry: { select: { userId: true } } },
  });
  if (!task || task.dailyEntry.userId !== user.id) throw new Error("권한 없음");

  await prisma.timelineTask.update({
    where: { id: parsed.taskId },
    data: {
      title: parsed.title.trim(),
      startTime: parsed.startTime,
      dueTime: parsed.dueTime,
    },
  });
  revalidatePath("/today");
  revalidatePath("/feed");
}

const mustCheckSchema = z.object({
  mustCheckId: z.string().uuid(),
  isCompleted: z.boolean(),
  reason: z.string().nullable(),
});

export async function updateMustCheck(input: z.infer<typeof mustCheckSchema>) {
  const user = await requireUser();
  const parsed = mustCheckSchema.parse(input);

  const check = await prisma.mustCheck.findUnique({
    where: { id: parsed.mustCheckId },
    include: { dailyEntry: { select: { userId: true } } },
  });
  if (!check || check.dailyEntry.userId !== user.id) throw new Error("권한 없음");

  await prisma.mustCheck.update({
    where: { id: parsed.mustCheckId },
    data: { isCompleted: parsed.isCompleted, reason: parsed.reason },
  });

  revalidatePath("/today");
  revalidatePath("/feed");
}

// 통합 메모 업데이트
const memoSchema = z.object({
  kind: z.enum(["timeline", "must", "assignment"]),
  id: z.string().uuid(),
  memo: z.string().max(2000).nullable(),
});

export async function updateMemo(input: z.infer<typeof memoSchema>) {
  const user = await requireUser();
  const parsed = memoSchema.parse(input);
  const memo = parsed.memo?.trim() || null;

  if (parsed.kind === "timeline") {
    const t = await prisma.timelineTask.findUnique({
      where: { id: parsed.id },
      include: { dailyEntry: { select: { userId: true } } },
    });
    if (!t || t.dailyEntry.userId !== user.id) throw new Error("권한 없음");
    await prisma.timelineTask.update({ where: { id: parsed.id }, data: { memo } });
  } else if (parsed.kind === "must") {
    const c = await prisma.mustCheck.findUnique({
      where: { id: parsed.id },
      include: { dailyEntry: { select: { userId: true } } },
    });
    if (!c || c.dailyEntry.userId !== user.id) throw new Error("권한 없음");
    await prisma.mustCheck.update({ where: { id: parsed.id }, data: { memo } });
  } else {
    const c = await prisma.assignedTaskCompletion.findUnique({
      where: { id: parsed.id },
    });
    if (!c || c.userId !== user.id) throw new Error("권한 없음");
    await prisma.assignedTaskCompletion.update({
      where: { id: parsed.id },
      data: { memo },
    });
  }

  revalidatePath("/today");
  revalidatePath("/feed");
  revalidatePath("/me");
  revalidatePath("/operator");
}
