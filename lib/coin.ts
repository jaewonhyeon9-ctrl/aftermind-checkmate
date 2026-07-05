import { prisma } from "@/lib/prisma";
import type { CoinReason } from "@prisma/client";
import { sendPushToUser } from "@/lib/push";
import { isActiveMember } from "@/lib/program";

/**
 * 에마 시스템 (이벤트 소싱). 과정(Program)별로 완전히 분리된 경제.
 * fromUserId == null → 시스템 발행 (현재 정책: 해당 과정 내 누구나 무한 발행 가능)
 * 잔액 = sum(received) - sum(sent), 항상 programId로 스코프됨
 */

type ProgramRef = { id: string };

export async function getBalance(userId: string, programId: string): Promise<number> {
  const [received, sent] = await Promise.all([
    prisma.coinLedger.aggregate({
      where: { toUserId: userId, programId },
      _sum: { amount: true },
    }),
    prisma.coinLedger.aggregate({
      where: { fromUserId: userId, programId },
      _sum: { amount: true },
    }),
  ]);
  return (received._sum.amount ?? 0) - (sent._sum.amount ?? 0);
}

export async function getBalances(
  userIds: string[],
  programId: string,
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const [received, sent] = await Promise.all([
    prisma.coinLedger.groupBy({
      by: ["toUserId"],
      where: { toUserId: { in: userIds }, programId },
      _sum: { amount: true },
    }),
    prisma.coinLedger.groupBy({
      by: ["fromUserId"],
      where: { fromUserId: { in: userIds }, programId },
      _sum: { amount: true },
    }),
  ]);

  const map: Record<string, number> = Object.fromEntries(userIds.map((id) => [id, 0]));
  for (const r of received) map[r.toUserId] = (map[r.toUserId] ?? 0) + (r._sum.amount ?? 0);
  for (const s of sent) {
    if (s.fromUserId) map[s.fromUserId] = (map[s.fromUserId] ?? 0) - (s._sum.amount ?? 0);
  }
  return map;
}

type IssueParams = {
  toUserId: string;
  amount: number;
  program: ProgramRef;
  memo?: string | null;
  relatedPostId?: string | null;
};

/** 시스템 발행 (fromUserId = null). 무한 발행. */
export async function issueCoin({ toUserId, amount, program, memo, relatedPostId }: IssueParams) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount는 양의 정수여야 합니다");
  if (!(await isActiveMember(toUserId, program.id))) {
    throw new Error("받는 사람이 이 과정 소속이 아니에요");
  }
  const ledger = await prisma.coinLedger.create({
    data: {
      fromUserId: null,
      toUserId,
      programId: program.id,
      amount,
      reason: "ISSUE",
      memo: memo?.trim() || null,
      relatedPostId: relatedPostId ?? null,
    },
  });
  // fire-and-forget push
  sendPushToUser(toUserId, {
    title: "💎 에마 발행 받음",
    body: `${amount.toLocaleString("ko-KR")} 에마이 발행되어 들어왔어요${memo ? `: ${memo}` : ""}`,
    url: "/team/coin",
    tag: `coin-${ledger.id}`,
  }).catch(() => {});
  return ledger;
}

type TransferParams = {
  fromUserId: string;
  toUserId: string;
  amount: number;
  program: ProgramRef;
  reason?: CoinReason;
  memo?: string | null;
  relatedPostId?: string | null;
};

/** 사용자 → 사용자 송금 (같은 과정 내에서만). 잔액 부족 시 throw. */
export async function transferCoin({
  fromUserId,
  toUserId,
  amount,
  program,
  reason = "TRANSFER",
  memo,
  relatedPostId,
}: TransferParams) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount는 양의 정수여야 합니다");
  if (fromUserId === toUserId) throw new Error("자기 자신에게는 송금할 수 없습니다");
  if (!(await isActiveMember(toUserId, program.id))) {
    throw new Error("받는 사람이 이 과정 소속이 아니에요");
  }

  const balance = await getBalance(fromUserId, program.id);
  if (balance < amount) throw new Error(`잔액 부족 (보유: ${balance.toLocaleString("ko-KR")} 에마)`);

  const ledger = await prisma.coinLedger.create({
    data: {
      fromUserId,
      toUserId,
      programId: program.id,
      amount,
      reason,
      memo: memo?.trim() || null,
      relatedPostId: relatedPostId ?? null,
    },
  });
  const sender = await prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true } });
  const reasonLabel: Record<CoinReason, string> = {
    ISSUE: "에마 발행",
    TRANSFER: "에마 송금",
    CONTRIBUTION_REWARD: "기여 보상",
    CLASS_REWARD: "수업 보상",
  };
  sendPushToUser(toUserId, {
    title: `💎 ${reasonLabel[reason]}`,
    body: `${sender?.name ?? "누군가"}님이 ${amount.toLocaleString("ko-KR")} 에마을 보냈어요${memo ? `: ${memo}` : ""}`,
    url: "/team/coin",
    tag: `coin-${ledger.id}`,
  }).catch(() => {});
  return ledger;
}