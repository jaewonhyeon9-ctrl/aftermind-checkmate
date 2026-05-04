import { prisma } from "@/lib/prisma";
import type { CoinReason } from "@prisma/client";

/**
 * 코인 시스템 (이벤트 소싱).
 * fromUserId == null → 시스템 발행 (현재 정책: 모든 사용자가 무한 발행 가능)
 * 잔액 = sum(received) - sum(sent)
 */

export async function getBalance(userId: string): Promise<number> {
  const [received, sent] = await Promise.all([
    prisma.coinLedger.aggregate({
      where: { toUserId: userId },
      _sum: { amount: true },
    }),
    prisma.coinLedger.aggregate({
      where: { fromUserId: userId },
      _sum: { amount: true },
    }),
  ]);
  return (received._sum.amount ?? 0) - (sent._sum.amount ?? 0);
}

export async function getBalances(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const [received, sent] = await Promise.all([
    prisma.coinLedger.groupBy({
      by: ["toUserId"],
      where: { toUserId: { in: userIds } },
      _sum: { amount: true },
    }),
    prisma.coinLedger.groupBy({
      by: ["fromUserId"],
      where: { fromUserId: { in: userIds } },
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
  memo?: string | null;
  relatedPostId?: string | null;
};

/** 시스템 발행 (fromUserId = null). 무한 발행. */
export async function issueCoin({ toUserId, amount, memo, relatedPostId }: IssueParams) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount는 양의 정수여야 합니다");
  return prisma.coinLedger.create({
    data: {
      fromUserId: null,
      toUserId,
      amount,
      reason: "ISSUE",
      memo: memo?.trim() || null,
      relatedPostId: relatedPostId ?? null,
    },
  });
}

type TransferParams = {
  fromUserId: string;
  toUserId: string;
  amount: number;
  reason?: CoinReason;
  memo?: string | null;
  relatedPostId?: string | null;
};

/** 사용자 → 사용자 송금. 잔액 부족 시 throw. */
export async function transferCoin({
  fromUserId,
  toUserId,
  amount,
  reason = "TRANSFER",
  memo,
  relatedPostId,
}: TransferParams) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount는 양의 정수여야 합니다");
  if (fromUserId === toUserId) throw new Error("자기 자신에게는 송금할 수 없습니다");

  const balance = await getBalance(fromUserId);
  if (balance < amount) throw new Error(`잔액 부족 (보유: ${balance.toLocaleString("ko-KR")} 코인)`);

  return prisma.coinLedger.create({
    data: {
      fromUserId,
      toUserId,
      amount,
      reason,
      memo: memo?.trim() || null,
      relatedPostId: relatedPostId ?? null,
    },
  });
}
