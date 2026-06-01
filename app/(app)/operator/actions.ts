"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOperator } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push";

const createTaskSchema = z
  .object({
    scope: z.enum(["ALL", "INDIVIDUAL"]),
    title: z.string().min(1).max(120),
    description: z.string().nullable(),
    videoUrl: z.string().url().nullable().or(z.literal("").transform(() => null)),
    attachments: z.array(z.string().url()).default([]),
    dueDate: z.string().nullable(),
    assigneeId: z.string().uuid().nullable(),
  })
  .refine((d) => d.scope !== "INDIVIDUAL" || !!d.assigneeId, {
    message: "개별 과제는 받을 사람을 선택해야 해요",
    path: ["assigneeId"],
  });

export async function createAssignedTask(
  input: z.infer<typeof createTaskSchema>
) {
  const operator = await requireOperator();
  const parsed = createTaskSchema.parse(input);

  const due = parsed.dueDate ? new Date(parsed.dueDate + "T23:59:59.000Z") : null;

  // 대상 결정
  let targetUserIds: string[];
  if (parsed.scope === "ALL") {
    const members = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    targetUserIds = members.map((m) => m.id);
  } else {
    targetUserIds = [parsed.assigneeId!];
  }

  const task = await prisma.$transaction(async (tx) => {
    const task = await tx.assignedTask.create({
      data: {
        creatorId: operator.id,
        scope: parsed.scope,
        title: parsed.title,
        description: parsed.description,
        videoUrl: parsed.videoUrl,
        attachments: parsed.attachments,
        dueDate: due,
      },
    });
    await tx.assignedTaskCompletion.createMany({
      data: targetUserIds.map((uid) => ({
        taskId: task.id,
        userId: uid,
      })),
    });
    return task;
  });

  // 부여 받은 팀원들에게 푸시 (본인 제외)
  const recipients = targetUserIds.filter((uid) => uid !== operator.id);
  if (recipients.length > 0) {
    sendPushToUsers(recipients, {
      title: parsed.scope === "ALL" ? "🔥 새 전체 필수 과제" : "⭐ 새 개별 과제",
      body: parsed.title,
      url: "/today",
      tag: `task-${task.id}`,
    }).catch(() => {});
  }

  revalidatePath("/operator");
  revalidatePath("/today");
  revalidatePath("/me");
}

export async function deleteAssignedTask(taskId: string) {
  await requireOperator();
  await prisma.assignedTask.delete({ where: { id: taskId } });
  revalidatePath("/operator");
  revalidatePath("/today");
  revalidatePath("/me");
}

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().nullable(),
  videoUrl: z.string().url().nullable().or(z.literal("").transform(() => null)),
  attachments: z.array(z.string().url()).default([]),
  dueDate: z.string().nullable(),
});

export async function updateAssignedTask(input: z.infer<typeof updateTaskSchema>) {
  await requireOperator();
  const parsed = updateTaskSchema.parse(input);
  const due = parsed.dueDate ? new Date(parsed.dueDate + "T23:59:59.000Z") : null;

  await prisma.assignedTask.update({
    where: { id: parsed.taskId },
    data: {
      title: parsed.title.trim(),
      description: parsed.description?.trim() || null,
      videoUrl: parsed.videoUrl,
      attachments: parsed.attachments,
      dueDate: due,
    },
  });

  revalidatePath("/operator");
  revalidatePath("/today");
  revalidatePath("/me");
}

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["OPERATOR", "MEMBER"]),
});

export async function updateUserRole(input: z.infer<typeof roleSchema>) {
  const me = await requireOperator();
  const parsed = roleSchema.parse(input);

  if (parsed.userId === me.id && parsed.role === "MEMBER") {
    // 마지막 운영자가 자기 자신을 강등하면 안 됨
    const operatorCount = await prisma.user.count({
      where: { role: "OPERATOR", isActive: true },
    });
    if (operatorCount <= 1) throw new Error("마지막 운영자는 강등할 수 없어요");
  }

  await prisma.user.update({
    where: { id: parsed.userId },
    data: { role: parsed.role },
  });
  revalidatePath("/operator");
}

export async function toggleUserActive(userId: string) {
  await requireOperator();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("사용자를 찾을 수 없어요");
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });
  revalidatePath("/operator");
  revalidatePath("/feed");
}

const checkinConfigSchema = z.object({
  enabled: z.boolean(),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
});

export async function updateCheckinConfig(input: z.infer<typeof checkinConfigSchema>) {
  await requireOperator();
  const parsed = checkinConfigSchema.parse(input);
  if (parsed.startHour > parsed.endHour) {
    throw new Error("시작 시각이 종료 시각보다 늦을 수 없어요");
  }
  await prisma.checkinConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed },
    update: parsed,
  });
  revalidatePath("/operator");
  revalidatePath("/checkin");
  revalidatePath("/checkstagram");
}

// ============ 공지사항 (Announcement) ============

const announcementSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(4000).nullable(),
  pinned: z.boolean(),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
});

export async function createAnnouncement(input: z.infer<typeof announcementSchema>) {
  const operator = await requireOperator();
  const parsed = announcementSchema.parse(input);

  const a = await prisma.announcement.create({
    data: {
      authorId: operator.id,
      title: parsed.title.trim(),
      body: parsed.body?.trim() || null,
      pinned: parsed.pinned,
      startAt: parsed.startAt ? new Date(parsed.startAt + "T00:00:00.000Z") : null,
      endAt: parsed.endAt ? new Date(parsed.endAt + "T23:59:59.000Z") : null,
    },
  });

  // 전체 활성 팀원에게 푸시 (운영자 본인 제외)
  const members = await prisma.user.findMany({
    where: { isActive: true, id: { not: operator.id } },
    select: { id: true },
  });
  if (members.length > 0) {
    sendPushToUsers(
      members.map((m) => m.id),
      {
        title: "📢 새 공지사항",
        body: parsed.title,
        url: "/today",
        tag: `announcement-${a.id}`,
      }
    ).catch(() => {});
  }

  revalidatePath("/operator");
  revalidatePath("/today");
}

const updateAnnouncementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().max(4000).nullable(),
  pinned: z.boolean(),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
});

export async function updateAnnouncement(input: z.infer<typeof updateAnnouncementSchema>) {
  await requireOperator();
  const parsed = updateAnnouncementSchema.parse(input);

  await prisma.announcement.update({
    where: { id: parsed.id },
    data: {
      title: parsed.title.trim(),
      body: parsed.body?.trim() || null,
      pinned: parsed.pinned,
      startAt: parsed.startAt ? new Date(parsed.startAt + "T00:00:00.000Z") : null,
      endAt: parsed.endAt ? new Date(parsed.endAt + "T23:59:59.000Z") : null,
    },
  });

  revalidatePath("/operator");
  revalidatePath("/today");
}

export async function deleteAnnouncement(id: string) {
  await requireOperator();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/operator");
  revalidatePath("/today");
}

// ============ 전체 팀원 타임라인 동시 푸시 ============

const broadcastTimelineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/),
  isRoutine: z.boolean().default(false),
});

/**
 * 모든 활성 팀원의 지정한 날짜 DailyEntry에 동일한 TimelineTask를 일괄 추가.
 * DailyEntry가 없으면 생성. 작성자 본인을 포함하여 모든 활성 팀원에게 적용됨.
 */
export async function broadcastTimelineTask(
  input: z.infer<typeof broadcastTimelineSchema>
) {
  const operator = await requireOperator();
  const parsed = broadcastTimelineSchema.parse(input);

  const dateObj = new Date(parsed.date + "T00:00:00.000Z");
  const members = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const m of members) {
      const entry = await tx.dailyEntry.upsert({
        where: { userId_date: { userId: m.id, date: dateObj } },
        create: { userId: m.id, date: dateObj },
        update: {},
      });
      const last = await tx.timelineTask.findFirst({
        where: { dailyEntryId: entry.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await tx.timelineTask.create({
        data: {
          dailyEntryId: entry.id,
          title: parsed.title.trim(),
          startTime: parsed.startTime,
          dueTime: parsed.dueTime,
          isRoutine: parsed.isRoutine,
          order: (last?.order ?? -1) + 1,
        },
      });
      created += 1;
    }
  });

  // 본인 제외 푸시
  const recipientIds = members.map((m) => m.id).filter((id) => id !== operator.id);
  if (recipientIds.length > 0) {
    sendPushToUsers(recipientIds, {
      title: "🗓 새 일정",
      body: `${parsed.startTime} ${parsed.title}`,
      url: "/today",
      tag: `broadcast-${parsed.date}-${Date.now()}`,
    }).catch(() => {});
  }

  revalidatePath("/operator");
  revalidatePath("/today");
  revalidatePath("/feed");
  return { created };
}

export async function toggleAssignedCompletion(completionId: string) {
  // 본인이 자기 과제 체크하는 액션 (운영자 권한 불필요)
  const { requireUser } = await import("@/lib/auth");
  const me = await requireUser();

  const completion = await prisma.assignedTaskCompletion.findUnique({
    where: { id: completionId },
  });
  if (!completion || completion.userId !== me.id) throw new Error("권한 없음");

  await prisma.assignedTaskCompletion.update({
    where: { id: completionId },
    data: {
      isCompleted: !completion.isCompleted,
      completedAt: completion.isCompleted ? null : new Date(),
    },
  });
  revalidatePath("/today");
  revalidatePath("/me");
  revalidatePath("/operator");
}
