import { ArrowDownLeft, ArrowUpRight, Sparkles, Coins } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalance, getBalances } from "@/lib/coin";
import { SendCoinForm } from "./SendCoinForm";

export const dynamic = "force-dynamic";

const reasonLabel: Record<string, string> = {
  ISSUE: "✨ 발행",
  TRANSFER: "↔️ 송금",
  CONTRIBUTION_REWARD: "🤝 기여 보상",
  CLASS_REWARD: "🎓 수업 보상",
};

export default async function CoinPage() {
  const me = await requireUser();

  const [members, myBalance, recent] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, role: true },
    }),
    getBalance(me.id),
    prisma.coinLedger.findMany({
      where: {
        OR: [{ fromUserId: me.id }, { toUserId: me.id }],
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const balanceMap = await getBalances(members.map((m) => m.id));
  const ranked = members
    .map((m) => ({ ...m, balance: balanceMap[m.id] ?? 0 }))
    .sort((a, b) => b.balance - a.balance);

  return (
    <>
      <PageHeader title="💎 에마" subtitle={`내 잔액 ${myBalance.toLocaleString("ko-KR")}`} />
      <div className="px-5 py-5 space-y-5">
        {/* 내 잔액 카드 */}
        <section
          className="rounded-2xl p-5 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(0,224,255,0.1), rgba(161,85,255,0.1))",
            border: "1px solid rgba(0,224,255,0.3)",
          }}
        >
          <p className="text-[11px] tracking-wider uppercase font-semibold" style={{ color: "var(--fg-muted)" }}>
            내 잔액
          </p>
          <p
            className="mt-1 text-4xl font-black tabular-nums"
            style={{
              background: "linear-gradient(90deg, #00e0ff, #a155ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {myBalance.toLocaleString("ko-KR")}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--fg-muted)" }}>
            💎 에마
          </p>
        </section>

        {/* 송금/발행 폼 */}
        <SendCoinForm members={members} myId={me.id} myBalance={myBalance} />

        {/* 팀원 잔액 */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--fg-muted)" }}>
            팀원 잔액
          </h2>
          <div
            className="rounded-2xl divide-y"
            style={{
              background: "rgba(15,20,40,0.5)",
              border: "1px solid var(--line)",
              borderColor: "var(--line)",
            }}
          >
            {ranked.map((m, i) => (
              <div key={m.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold tabular-nums w-5 text-center"
                    style={{ color: i < 3 ? "var(--accent-lime)" : "var(--fg-muted)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm" style={{ color: m.id === me.id ? "var(--accent-cyan)" : "var(--fg)" }}>
                    {m.name}
                    {m.id === me.id && (
                      <span className="ml-1 text-[10px]" style={{ color: "var(--accent-cyan)" }}>(나)</span>
                    )}
                  </span>
                </div>
                <span
                  className="text-sm font-bold tabular-nums inline-flex items-center gap-1"
                  style={{ color: "var(--accent-lime)" }}
                >
                  <Coins size={12} />
                  {m.balance.toLocaleString("ko-KR")}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 내 거래 내역 */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--fg-muted)" }}>
            내 거래 내역
          </h2>
          {recent.length === 0 && (
            <div
              className="rounded-2xl p-6 text-center text-sm"
              style={{
                background: "rgba(15,20,40,0.4)",
                border: "1px solid var(--line)",
                color: "var(--fg-muted)",
              }}
            >
              아직 거래 내역이 없어요.
            </div>
          )}
          <div className="space-y-1.5">
            {recent.map((t) => {
              const isReceive = t.toUserId === me.id;
              const counterparty = isReceive ? t.fromUser?.name ?? "시스템 발행" : t.toUser.name;
              return (
                <div
                  key={t.id}
                  className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                  style={{
                    background: "rgba(15,20,40,0.5)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                        {reasonLabel[t.reason] ?? t.reason}
                      </span>
                      <span className="text-xs font-medium truncate" style={{ color: "var(--fg)" }}>
                        {isReceive ? `from ${counterparty}` : `to ${counterparty}`}
                      </span>
                    </div>
                    {t.memo && (
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>
                        {t.memo}
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--fg-muted)" }}>
                      {t.createdAt.toISOString().slice(0, 10)} {t.createdAt.toISOString().slice(11, 16)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-bold tabular-nums inline-flex items-center gap-0.5"
                      style={{
                        color: isReceive ? "var(--accent-lime)" : "#fb7185",
                      }}
                    >
                      {isReceive ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                      {isReceive ? "+" : "−"}
                      {t.amount.toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
