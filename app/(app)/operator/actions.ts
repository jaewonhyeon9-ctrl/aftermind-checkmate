"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireOperatorWithProgram, getActiveProgramMemberIds, isActiveMember } from "@/lib/program";
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
  const { user: operator, program } = await requireOperatorWithProgram();
  const parsed = createTaskSchema.parse(input);

  const due = parsed.dueDate ? new Date(parsed.dueDate + "T23:59:59.000Z") : null;

  // 대상 결정
  let targetUserIds: string[];
  if (parsed.scope === "ALL") {
    targetUserIds = await getActiveProgramMemberIds(program.id);
  } else {
    if (!(await isActiveMember(parsed.assigneeId!, program.id))) {
      throw new Error("받는 사람이 이 과정 소속이 아니에요");
    }
    targetUserIds = [parsed.assigneeId!];
  }

  const task = await prisma.$transaction(async (tx) => {
    const task = await tx.assignedTask.create({
      data: {
        creatorId: operator.id,
        programId: program.id,
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
  await requireOperatorWithProgram();
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
  await requireOperatorWithProgram();
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

/** 이 과정 내에서의 역할(Membership.role) 변경 — 다른 과정 소속엔 영향 없음. */
export async function updateUserRole(input: z.infer<typeof roleSchema>) {
  const { user: me, program } = await requireOperatorWithProgram();
  const parsed = roleSchema.parse(input);

  if (parsed.userId === me.id && parsed.role === "MEMBER") {
    // 이 과정의 마지막 운영자가 자기 자신을 강등하면 안 됨
    const operatorCount = await prisma.membership.count({
      where: { programId: program.id, role: "OPERATOR", status: "ACTIVE" },
    });
    if (operatorCount <= 1) throw new Error("마지막 운영자는 강등할 수 없어요");
  }

  await prisma.membership.update({
    where: { userId_programId: { userId: parsed.userId, programId: program.id } },
    data: { role: parsed.role },
  });
  revalidatePath("/operator");
}

/**
 * 이 과정에서 팀원을 비활성화/재활성화한다. Membership에는 isActive가 없으므로
 * status를 ACTIVE ⇄ SUSPENDED로 토글한다 (다른 과정 소속·User 전역 상태엔 영향 없음).
 * REJECTED는 "가입 신청 거절"만을 뜻하므로 여기서는 쓰지 않는다 — 두 상태를 구분해야
 * 나중에 "거절된 신청자"와 "활동하다 비활성화된 팀원"을 다르게 다룰 수 있다.
 */
export async function toggleUserActive(userId: string) {
  const { program } = await requireOperatorWithProgram();
  const membership = await prisma.membership.findUnique({
    where: { userId_programId: { userId, programId: program.id } },
  });
  if (!membership) throw new Error("팀원을 찾을 수 없어요");

  await prisma.membership.update({
    where: { userId_programId: { userId, programId: program.id } },
    data: { status: membership.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
  });
  revalidatePath("/operator");
  revalidatePath("/feed");
}

/** 가입 대기 중인 멤버십을 승인한다. */
export async function approveMembership(userId: string) {
  const { program } = await requireOperatorWithProgram();
  await prisma.membership.update({
    where: { userId_programId: { userId, programId: program.id } },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/operator");
}

/** 가입 대기 중인 멤버십을 거절한다. */
export async function rejectMembership(userId: string) {
  const { program } = await requireOperatorWithProgram();
  await prisma.membership.update({
    where: { userId_programId: { userId, programId: program.id } },
    data: { status: "REJECTED" },
  });
  revalidatePath("/operator");
}

const checkinConfigSchema = z.object({
  enabled: z.boolean(),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
});

export async function updateCheckinConfig(input: z.infer<typeof checkinConfigSchema>) {
  const { program } = await requireOperatorWithProgram();
  const parsed = checkinConfigSchema.parse(input);
  if (parsed.startHour > parsed.endHour) {
    throw new Error("시작 시각이 종료 시각보다 늦을 수 없어요");
  }
  await prisma.checkinConfig.upsert({
    where: { programId: program.id },
    create: { programId: program.id, ...parsed },
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
  const { user: operator, program } = await requireOperatorWithProgram();
  const parsed = announcementSchema.parse(input);

  const a = await prisma.announcement.create({
    data: {
      programId: program.id,
      authorId: operator.id,
      title: parsed.title.trim(),
      body: parsed.body?.trim() || null,
      pinned: parsed.pinned,
      startAt: parsed.startAt ? new Date(parsed.startAt + "T00:00:00.000Z") : null,
      endAt: parsed.endAt ? new Date(parsed.endAt + "T23:59:59.000Z") : null,
    },
  });

  // 전체 활성 팀원에게 푸시 (운영자 본인 제외)
  const memberIds = (await getActiveProgramMemberIds(program.id)).filter(
    (id) => id !== operator.id
  );
  if (memberIds.length > 0) {
    sendPushToUsers(memberIds, {
      title: "📢 새 공지사항",
      body: parsed.title,
      url: "/today",
      tag: `announcement-${a.id}`,
    }).catch(() => {});
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
  await requireOperatorWithProgram();
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
  await requireOperatorWithProgram();
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
 * 이 과정의 모든 활성 팀원의 지정한 날짜 DailyEntry에 동일한 TimelineTask를 일괄 추가.
 * DailyEntry가 없으면 생성. 작성자 본인을 포함하여 모든 활성 팀원에게 적용됨.
 */
export async function broadcastTimelineTask(
  input: z.infer<typeof broadcastTimelineSchema>
) {
  const { user: operator, program } = await requireOperatorWithProgram();
  const parsed = broadcastTimelineSchema.parse(input);

  const dateObj = new Date(parsed.date + "T00:00:00.000Z");
  const memberIds = await getActiveProgramMemberIds(program.id);

  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const uid of memberIds) {
      const entry = await tx.dailyEntry.upsert({
        where: { userId_programId_date: { userId: uid, programId: program.id, date: dateObj } },
        create: { userId: uid, programId: program.id, date: dateObj },
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
  const recipientIds = memberIds.filter((id) => id !== operator.id);
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