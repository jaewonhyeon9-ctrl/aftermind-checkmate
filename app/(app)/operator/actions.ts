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
