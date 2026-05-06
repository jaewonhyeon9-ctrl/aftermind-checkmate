"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { issueCoin, transferCoin } from "@/lib/coin";

// ===== ContributionPost =====

const createPostSchema = z.object({
  type: z.enum(["SKILL", "CLASS"]),
  title: z.string().min(1).max(80),
  description: z.string().max(2000).nullable(),
  coinReward: z.number().int().min(0).max(1_000_000),
  maxApplicants: z.number().int().positive().max(1000).nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function createPost(input: z.infer<typeof createPostSchema>) {
  const user = await requireUser();
  const parsed = createPostSchema.parse(input);
  await prisma.contributionPost.create({
    data: {
      authorId: user.id,
      type: parsed.type,
      title: parsed.title.trim(),
      description: parsed.description?.trim() || null,
      coinReward: parsed.coinReward,
      maxApplicants: parsed.maxApplicants,
      deadline: parsed.deadline ? new Date(parsed.deadline + "T23:59:59.000Z") : null,
    },
  });
  revalidatePath(parsed.type === "SKILL" ? "/team/contribute" : "/team/class");
}

const updatePostSchema = z.object({
  postId: z.string().uuid(),
  title: z.string().min(1).max(80),
  description: z.string().max(2000).nullable(),
  coinReward: z.number().int().min(0).max(1_000_000),
  maxApplicants: z.number().int().positive().max(1000).nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function updatePost(input: z.infer<typeof updatePostSchema>) {
  const user = await requireUser();
  const parsed = updatePostSchema.parse(input);
  const post = await prisma.contributionPost.findUnique({ where: { id: parsed.postId } });
  if (!post || post.authorId !== user.id) throw new Error("권한 없음");
  await prisma.contributionPost.update({
    where: { id: parsed.postId },
    data: {
      title: parsed.title.trim(),
      description: parsed.description?.trim() || null,
      coinReward: parsed.coinReward,
      maxApplicants: parsed.maxApplicants,
      deadline: parsed.deadline ? new Date(parsed.deadline + "T23:59:59.000Z") : null,
    },
  });
  revalidatePath(post.type === "SKILL" ? "/team/contribute" : "/team/class");
  revalidatePath(`/team/post/${parsed.postId}`);
}

export async function closePost(postId: string) {
  const user = await requireUser();
  const post = await prisma.contributionPost.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) throw new Error("권한 없음");
  await prisma.contributionPost.update({
    where: { id: postId },
    data: { status: "CLOSED" },
  });
  revalidatePath("/team/contribute");
  revalidatePath("/team/class");
}

export async function reopenPost(postId: string) {
  const user = await requireUser();
  const post = await prisma.contributionPost.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) throw new Error("권한 없음");
  await prisma.contributionPost.update({
    where: { id: postId },
    data: { status: "OPEN" },
  });
  revalidatePath("/team/contribute");
  revalidatePath("/team/class");
}

export async function deletePost(postId: string) {
  const user = await requireUser();
  const post = await prisma.contributionPost.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) throw new Error("권한 없음");
  await prisma.contributionPost.delete({ where: { id: postId } });
  revalidatePath("/team/contribute");
  revalidatePath("/team/class");
}

// ===== ContributionApplication =====

const applySchema = z.object({
  postId: z.string().uuid(),
  message: z.string().max(500).nullable(),
});

export async function applyToPost(input: z.infer<typeof applySchema>) {
  const user = await requireUser();
  const parsed = applySchema.parse(input);
  const post = await prisma.contributionPost.findUnique({
    where: { id: parsed.postId },
    include: { applications: { where: { status: { in: ["ACCEPTED", "PENDING", "COMPLETED"] } } } },
  });
  if (!post) throw new Error("게시글이 없습니다");
  if (post.status === "CLOSED") throw new Error("마감된 게시글입니다");
  if (post.authorId === user.id) throw new Error("본인 게시글에는 신청할 수 없습니다");
  if (post.deadline && post.deadline.getTime() < Date.now()) throw new Error("마감 기한이 지났습니다");

  // 수업: 선착순 자동 등록 → ACCEPTED. 기여: 게시자 승인 필요 → PENDING.
  let status: "PENDING" | "ACCEPTED" = post.type === "CLASS" ? "ACCEPTED" : "PENDING";
  if (post.type === "CLASS" && post.maxApplicants != null) {
    const count = post.applications.filter((a) => a.status === "ACCEPTED" || a.status === "COMPLETED").length;
    if (count >= post.maxApplicants) throw new Error("정원이 마감되었습니다");
  }

  await prisma.contributionApplication.upsert({
    where: { postId_applicantId: { postId: parsed.postId, applicantId: user.id } },
    create: {
      postId: parsed.postId,
      applicantId: user.id,
      message: parsed.message?.trim() || null,
      status,
    },
    update: {
      message: parsed.message?.trim() || null,
      status,
    },
  });

  revalidatePath("/team/contribute");
  revalidatePath("/team/class");
  revalidatePath(`/team/post/${parsed.postId}`);
}

export async function cancelApplication(applicationId: string) {
  const user = await requireUser();
  const app = await prisma.contributionApplication.findUnique({ where: { id: applicationId } });
  if (!app || app.applicantId !== user.id) throw new Error("권한 없음");
  if (app.status === "COMPLETED") throw new Error("이미 완료된 신청은 취소할 수 없습니다");
  await prisma.contributionApplication.delete({ where: { id: applicationId } });
  revalidatePath("/team/contribute");
  revalidatePath("/team/class");
  revalidatePath(`/team/post/${app.postId}`);
}

const decideSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["ACCEPTED", "REJECTED"]),
});

export async function decideApplication(input: z.infer<typeof decideSchema>) {
  const user = await requireUser();
  const parsed = decideSchema.parse(input);
  const app = await prisma.contributionApplication.findUnique({
    where: { id: parsed.applicationId },
    include: { post: true },
  });
  if (!app || app.post.authorId !== user.id) throw new Error("권한 없음");
  await prisma.contributionApplication.update({
    where: { id: parsed.applicationId },
    data: { status: parsed.decision },
  });
  revalidatePath(`/team/post/${app.postId}`);
}

/** 작성자가 신청자에게 보상 코인 송금 + 완료 처리 */
const completeSchema = z.object({
  applicationId: z.string().uuid(),
});

export async function completeAndReward(input: z.infer<typeof completeSchema>) {
  const user = await requireUser();
  const parsed = completeSchema.parse(input);
  const app = await prisma.contributionApplication.findUnique({
    where: { id: parsed.applicationId },
    include: { post: true },
  });
  if (!app || app.post.authorId !== user.id) throw new Error("권한 없음");
  if (app.status === "COMPLETED") throw new Error("이미 완료 처리됨");

  const reason = app.post.type === "CLASS" ? "CLASS_REWARD" : "CONTRIBUTION_REWARD";

  // 보상이 0보다 크면 작성자가 신청자에게 송금 (잔액 부족 시 throw)
  if (app.post.coinReward > 0) {
    await transferCoin({
      fromUserId: user.id,
      toUserId: app.applicantId,
      amount: app.post.coinReward,
      reason,
      memo: `[${app.post.type === "CLASS" ? "수업" : "기여"}] ${app.post.title}`,
      relatedPostId: app.post.id,
    });
  }

  await prisma.contributionApplication.update({
    where: { id: parsed.applicationId },
    data: { status: "COMPLETED" },
  });

  revalidatePath(`/team/post/${app.postId}`);
  revalidatePath("/team/coin");
}

// ===== Coin =====

const sendCoinSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.number().int().positive().max(1_000_000),
  memo: z.string().max(200).nullable(),
});

export async function sendCoin(input: z.infer<typeof sendCoinSchema>) {
  const user = await requireUser();
  const parsed = sendCoinSchema.parse(input);
  if (parsed.toUserId === user.id) throw new Error("자기 자신에게는 보낼 수 없습니다");

  await transferCoin({
    fromUserId: user.id,
    toUserId: parsed.toUserId,
    amount: parsed.amount,
    reason: "TRANSFER",
    memo: parsed.memo,
  });

  revalidatePath("/team/coin");
}

const issueCoinSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.number().int().positive().max(1_000_000),
  memo: z.string().max(200).nullable(),
});

/** 시스템 발행 — 무한 발행 정책. 누구나 자기/타인에게 발행 가능. */
export async function issueCoinAction(input: z.infer<typeof issueCoinSchema>) {
  await requireUser();
  const parsed = issueCoinSchema.parse(input);
  await issueCoin({
    toUserId: parsed.toUserId,
    amount: parsed.amount,
    memo: parsed.memo,
  });
  revalidatePath("/team/coin");
}
