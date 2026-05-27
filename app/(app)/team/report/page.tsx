import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowDownLeft, ArrowUpRight, Coins } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayInTz, dateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * 주간 리포트 — 월요일~일요일 단위.
 * URL: /team/report?week=YYYY-MM-DD (그 주의 월요일 날짜)
 * 토요일에 자동으로 "이번 주 리포트" 강조.
 */

type SP = Promise<{ week?: string }>;

export default async function ReportPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const tz = me.timezone || "Asia/Seoul";
  const today = todayInTz(tz);
  const sp = await searchParams;

  // 이번 주 월요일
  const thisMonday = mondayOf(today);
  const targetMonday = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : thisMonday;
  const sunday = addDays(targetMonday, 6);
  const nextMonday = addDays(targetMonday, 7);
  const prevMonday = addDays(targetMonday, -7);

  const start = dateOnly(targetMonday);
  const endExcl = dateOnly(nextMonday);

  // 데이터 병렬 조회
  const [members, ledger, dailyEntries, taskCompletions] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.coinLedger.findMany({
      where: { createdAt: { gte: start, lt: endExcl } },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyEntry.findMany({
      where: { date: { gte: start, lt: endExcl } },
      include: {
        user: { select: { id: true, name: true } },
        timelineTasks: true,
        mustChecks: true,
      },
    }),
    prisma.assignedTaskCompletion.findMany({
      where: { completedAt: { gte: start, lt: endExcl } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // ===== 코인 통계 =====
  const totalIssued = ledger.filter((l) => l.fromUserId === null).reduce((s, l) => s + l.amount, 0);
  const totalTransferred = ledger.filter((l) => l.fromUserId !== null).reduce((s, l) => s + l.amount, 0);

  type CoinPerUser = { id: string; name: string; received: number; sent: number; issued: number; rewarded: number };
  const coinByUser = new Map<string, CoinPerUser>();
  for (const m of members) {
    coinByUser.set(m.id, { id: m.id, name: m.name, received: 0, sent: 0, issued: 0, rewarded: 0 });
  }
  for (const l of ledger) {
    const recv = coinByUser.get(l.toUserId);
    if (recv) {
      recv.received += l.amount;
      if (l.reason === "CONTRIBUTION_REWARD" || l.reason === "CLASS_REWARD") recv.rewarded += l.amount;
    }
    if (l.fromUserId) {
      const sent = coinByUser.get(l.fromUserId);
      if (sent) sent.sent += l.amount;
    } else {
      const recv2 = coinByUser.get(l.toUserId);
      if (recv2) recv2.issued += l.amount;
    }
  }

  // ===== 체크리스트 통계 =====
  type CheckPerUser = {
    id: string;
    name: string;
    daysWritten: number;
    timelineTotal: number;
    timelineDone: number;
    timelineOnTime: number;
    mustTotal: number;
    mustDone: number;
    taskDone: number;
  };
  const checkByUser = new Map<string, CheckPerUser>();
  for (const m of members) {
    checkByUser.set(m.id, {
      id: m.id,
      name: m.name,
      daysWritten: 0,
      timelineTotal: 0,
      timelineDone: 0,
      timelineOnTime: 0,
      mustTotal: 0,
      mustDone: 0,
      taskDone: 0,
    });
  }
  for (const e of dailyEntries) {
    const c = checkByUser.get(e.userId);
    if (!c) continue;
    c.daysWritten++;
    c.timelineTotal += e.timelineTasks.length;
    c.timelineDone += e.timelineTasks.filter((t) => t.completedAt !== null).length;
    c.timelineOnTime += e.timelineTasks.filter((t) => t.isOnTime === true).length;
    c.mustTotal += e.mustChecks.length;
    c.mustDone += e.mustChecks.filter((mc) => mc.isCompleted).length;
  }
  for (const tc of taskCompletions) {
    if (!tc.isCompleted) continue;
    const c = checkByUser.get(tc.userId);
    if (c) c.taskDone++;
  }

  // 토요일 여부 (이번 주 리포트면 토요일 이후 강조)
  const isThisWeek = targetMonday === thisMonday;
  const dow = new Date(today + "T00:00:00.000Z").getUTCDay(); // 0=일, 6=토
  const isSatOrLater = dow === 0 || dow === 6; // 토요일 또는 일요일

  return (
    <>
      <PageHeader
        title="📊 주간 리포트"
        subtitle={`${targetMonday.slice(5).replace("-", ".")} ~ ${sunday.slice(5).replace("-", ".")}`}
        right={
          <span className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
            {isThisWeek ? "이번 주" : ""}
          </span>
        }
      />
      <div className="px-5 py-5 space-y-5">
        {/* 주간 네비 */}
        <nav className="flex items-center justify-between">
          <Link
            href={`/team/report?week=${prevMonday}`}
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--fg-muted)" }}
          >
            <ChevronLeft size={14} />
            이전 주
          </Link>
          {!isThisWeek ? (
            <Link
              href="/team/report"
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: "rgba(0,224,255,0.1)",
                border: "1px solid rgba(0,224,255,0.3)",
                color: "var(--accent-cyan)",
              }}
            >
              이번 주
            </Link>
          ) : (
            <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
              {isSatOrLater ? "🎉 주말 결산" : "진행 중"}
            </span>
          )}
          <Link
            href={`/team/report?week=${nextMonday}`}
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--fg-muted)" }}
          >
            다음 주
            <ChevronRight size={14} />
          </Link>
        </nav>

        {/* 코인 요약 */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--accent-lime)" }}>
            <Coins size={14} />
            에마 리포트
          </h2>

          <div className="grid grid-cols-3 gap-2">
            <Stat
              icon={<Sparkles size={12} />}
              label="발행"
              value={totalIssued}
              accent="lime"
            />
            <Stat
              icon={<ArrowUpRight size={12} />}
              label="송금"
              value={totalTransferred}
              accent="cyan"
            />
            <Stat
              icon={<ArrowDownLeft size={12} />}
              label="거래"
              value={ledger.length}
              suffix="건"
              accent="violet"
            />
          </div>

          <div
            className="rounded-2xl divide-y overflow-hidden"
            style={{
              background: "rgba(15,20,40,0.5)",
              border: "1px solid var(--line)",
              borderColor: "var(--line)",
            }}
          >
            <div
              className="grid grid-cols-5 gap-1 px-3 py-2 text-[10px] font-semibold uppercase"
              style={{ color: "var(--fg-muted)", background: "rgba(10,14,31,0.4)" }}
            >
              <span>이름</span>
              <span className="text-right">수령</span>
              <span className="text-right">송금</span>
              <span className="text-right">발행</span>
              <span className="text-right">보상</span>
            </div>
            {[...coinByUser.values()].map((u) => (
              <div key={u.id} className="grid grid-cols-5 gap-1 px-3 py-2 text-xs tabular-nums">
                <span className="truncate" style={{ color: "var(--fg)" }}>{u.name}</span>
                <span className="text-right" style={{ color: "var(--accent-lime)" }}>
                  {u.received > 0 ? `+${u.received.toLocaleString("ko-KR")}` : "—"}
                </span>
                <span className="text-right" style={{ color: "#fb7185" }}>
                  {u.sent > 0 ? `−${u.sent.toLocaleString("ko-KR")}` : "—"}
                </span>
                <span className="text-right" style={{ color: "var(--fg-dim)" }}>
                  {u.issued > 0 ? u.issued.toLocaleString("ko-KR") : "—"}
                </span>
                <span className="text-right" style={{ color: "var(--accent-cyan)" }}>
                  {u.rewarded > 0 ? u.rewarded.toLocaleString("ko-KR") : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 체크리스트 요약 */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--accent-cyan)" }}>
            ✅ 체크리스트 리포트
          </h2>

          <div
            className="rounded-2xl divide-y overflow-hidden"
            style={{
              background: "rgba(15,20,40,0.5)",
              border: "1px solid var(--line)",
              borderColor: "var(--line)",
            }}
          >
            <div
              className="grid grid-cols-5 gap-1 px-3 py-2 text-[10px] font-semibold uppercase"
              style={{ color: "var(--fg-muted)", background: "rgba(10,14,31,0.4)" }}
            >
              <span>이름</span>
              <span className="text-right">작성</span>
              <span className="text-right">타임</span>
              <span className="text-right">Must</span>
              <span className="text-right">과제</span>
            </div>
            {[...checkByUser.values()].map((u) => {
              const tlPct = u.timelineTotal > 0 ? Math.round((u.timelineDone / u.timelineTotal) * 100) : 0;
              const onTimePct = u.timelineDone > 0 ? Math.round((u.timelineOnTime / u.timelineDone) * 100) : 0;
              const mustPct = u.mustTotal > 0 ? Math.round((u.mustDone / u.mustTotal) * 100) : 0;
              return (
                <div key={u.id} className="px-3 py-2.5 space-y-1">
                  <div className="grid grid-cols-5 gap-1 text-xs tabular-nums">
                    <span className="truncate" style={{ color: "var(--fg)" }}>{u.name}</span>
                    <span className="text-right" style={{ color: u.daysWritten >= 5 ? "var(--accent-lime)" : "var(--fg-dim)" }}>
                      {u.daysWritten}/7일
                    </span>
                    <span className="text-right" style={{ color: tlPct >= 70 ? "var(--accent-cyan)" : "var(--fg-dim)" }}>
                      {u.timelineDone}/{u.timelineTotal} ({tlPct}%)
                    </span>
                    <span className="text-right" style={{ color: mustPct >= 70 ? "var(--accent-cyan)" : "var(--fg-dim)" }}>
                      {u.mustDone}/{u.mustTotal}
                    </span>
                    <span className="text-right" style={{ color: "var(--fg-dim)" }}>
                      {u.taskDone}건
                    </span>
                  </div>
                  {u.timelineDone > 0 && (
                    <p className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                      온타임 {u.timelineOnTime}건 ({onTimePct}%)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 거래 상세 (이번 주) */}
        {ledger.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--fg-muted)" }}>
              주간 에마 거래 ({ledger.length}건)
            </h2>
            <div className="space-y-1.5">
              {ledger.slice(0, 30).map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                  style={{
                    background: "rgba(15,20,40,0.5)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs" style={{ color: "var(--fg)" }}>
                      <span style={{ color: "var(--fg-muted)" }}>
                        {t.fromUser?.name ?? "시스템"}
                      </span>
                      {" → "}
                      <span>{t.toUser.name}</span>
                    </p>
                    {t.memo && (
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--fg-muted)" }}>
                        {t.memo}
                      </p>
                    )}
                  </div>
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{ color: t.fromUserId === null ? "var(--accent-lime)" : "var(--accent-cyan)" }}
                  >
                    +{t.amount.toLocaleString("ko-KR")}
                  </p>
                </div>
              ))}
              {ledger.length > 30 && (
                <p className="text-center text-xs" style={{ color: "var(--fg-muted)" }}>
                  외 {ledger.length - 30}건
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  accent: "lime" | "cyan" | "violet";
}) {
  const color =
    accent === "lime" ? "var(--accent-lime)" : accent === "cyan" ? "var(--accent-cyan)" : "var(--accent-violet)";
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(15,20,40,0.5)",
        border: "1px solid var(--line)",
      }}
    >
      <p className="text-[10px] inline-flex items-center gap-1" style={{ color: "var(--fg-muted)" }}>
        {icon}
        {label}
      </p>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color }}>
        {value.toLocaleString("ko-KR")}
        {suffix && <span className="text-[10px] ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

// === 날짜 헬퍼 ===
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  const dow = d.getUTCDay(); // 0=일
  const offset = (dow + 6) % 7; // 월요일까지 거리
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
