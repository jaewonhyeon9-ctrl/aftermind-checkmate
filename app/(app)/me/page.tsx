import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { LogoutButton } from "./LogoutButton";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  todayInTz,
  dateOnly,
  daysAgoInTz,
  thisWeekStartInTz,
  thisMonthStartInTz,
  currentWeekKey,
  currentMonthKey,
  currentYearKey,
} from "@/lib/dates";
import { ShareSummaryButton } from "./ShareSummaryButton";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ProfileEdit } from "./ProfileEdit";
import { LevelBadge } from "@/components/LevelBadge";
import { InstallButton } from "@/components/InstallPrompt";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import { KakaoIntegrationCard } from "./KakaoIntegrationCard";
import { PeriodPlans } from "./PeriodPlans";
import { MandalaChart } from "./MandalaChart";
import type { MandalaData } from "./actions";

export default async function MePage() {
  const user = await requireUser();
  const tz = user.timezone || "Asia/Seoul";
  const today = todayInTz(tz);
  const weekStart = thisWeekStartInTz(tz);
  const monthStart = thisMonthStartInTz(tz);
  const sixtyAgo = daysAgoInTz(90, tz);

  const weekKey = currentWeekKey(tz);
  const monthKey = currentMonthKey(tz);
  const yearKey = currentYearKey(tz);

  // 90일치 entries (캘린더 포함) + 기간 계획
  const [entries, mustChecksDone, assignmentsDone, weekPlan, monthPlan, yearPlan] =
    await Promise.all([
      prisma.dailyEntry.findMany({
        where: {
          userId: user.id,
          date: { gte: dateOnly(sixtyAgo) },
        },
        orderBy: { date: "desc" },
        include: {
          timelineTasks: { select: { completedAt: true, isOnTime: true } },
        },
      }),
      prisma.mustCheck.count({
        where: {
          isCompleted: true,
          dailyEntry: { userId: user.id, date: { gte: dateOnly(sixtyAgo) } },
        },
      }),
      prisma.assignedTaskCompletion.count({
        where: { userId: user.id, isCompleted: true },
      }),
      prisma.periodPlan.findUnique({
        where: { userId_scope_periodKey: { userId: user.id, scope: "WEEK", periodKey: weekKey } },
      }),
      prisma.periodPlan.findUnique({
        where: { userId_scope_periodKey: { userId: user.id, scope: "MONTH", periodKey: monthKey } },
      }),
      prisma.periodPlan.findUnique({
        where: { userId_scope_periodKey: { userId: user.id, scope: "YEAR", periodKey: yearKey } },
      }),
    ]);

  const stats = {
    today: computeStats(entries, today, today),
    week: computeStats(entries, weekStart, today),
    month: computeStats(entries, monthStart, today),
  };

  const streak = computeStreak(entries.map((e) => formatDate(e.date)), today);

  const recentInsights = entries
    .filter((e) => e.insight)
    .slice(0, 7)
    .map((e) => ({ date: formatDate(e.date), insight: e.insight! }));

  // 캘린더 마크
  const marks = entries.map((e) => {
    const total = e.timelineTasks.length;
    const done = e.timelineTasks.filter((t) => t.completedAt).length;
    const onTime = e.timelineTasks.filter((t) => t.isOnTime === true).length;
    return { date: formatDate(e.date), hasEntry: true, total, done, onTime };
  });

  return (
    <>
      <PageHeader
        title="내 기록"
        subtitle={`연속 작성 ${streak}일`}
        right={<LogoutButton variant="icon" />}
      />
      <div className="px-5 py-5 space-y-5">
        <ProfileEdit
          name={user.name}
          email={user.email}
          role={user.role}
          finalGoal={user.finalGoal}
          timezone={tz}
        />

        <LevelBadge
          counts={{
            entries: entries.length,
            timelineOnTime: entries.reduce(
              (sum, e) => sum + e.timelineTasks.filter((t) => t.isOnTime === true).length,
              0
            ),
            timelineLate: entries.reduce(
              (sum, e) => sum + e.timelineTasks.filter((t) => t.isOnTime === false).length,
              0
            ),
            mustChecksDone,
            assignmentsDone,
            streak,
          }}
        />

        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">📊 진행 상황</h3>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="오늘" {...stats.today} />
            <StatCard label="이번 주" {...stats.week} />
            <StatCard label="이번 달" {...stats.month} />
          </div>
        </section>

        <PeriodPlans
          weekPlan={weekPlan}
          weekKey={weekKey}
          monthPlan={monthPlan}
          monthKey={monthKey}
          yearPlan={yearPlan}
          yearKey={yearKey}
        />

        <MandalaChart initial={parseMandala(user.mandalaChart)} />

        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">📅 캘린더</h3>
          <MonthCalendar
            initialMonth={today}
            marks={marks}
            hrefBase="/entry"
            today={today}
          />
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">📝 최근 데일리</h3>
            <ShareSummaryButton
              userName={user.name}
              stats={stats}
              streak={streak}
            />
          </div>
          {entries.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400 text-center py-4">
              아직 데일리 리포트가 없어요.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {entries.slice(0, 14).map((e) => {
                const total = e.timelineTasks.length;
                const done = e.timelineTasks.filter((t) => t.completedAt).length;
                const onTime = e.timelineTasks.filter((t) => t.isOnTime === true).length;
                return (
                  <li key={e.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(formatDate(e.date) + "T00:00:00"), "M월 d일 (EEE)", {
                          locale: ko,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-700">
                        {done}/{total}
                      </p>
                      {onTime > 0 && (
                        <p className="text-[10px] text-emerald-600">온타임 {onTime}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {recentInsights.length > 0 && (
          <section className="rounded-2xl bg-white border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700">💡 Insight 모음</h3>
            <ul className="mt-2 space-y-2">
              {recentInsights.map((i, idx) => (
                <li key={idx} className="text-xs">
                  <span className="text-slate-400">{i.date}</span>
                  <span className="text-slate-700 ml-2">{i.insight}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <KakaoIntegrationCard />
        <PushSubscribeButton />
        <InstallButton />
        <LogoutButton />
      </div>
    </>
  );
}

type Stats = {
  entries: number;
  total: number;
  done: number;
  onTime: number;
};

function StatCard({
  label,
  entries,
  total,
  done,
  onTime,
}: { label: string } & Stats) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{pct}%</p>
      <p className="text-[10px] text-slate-500">
        {done}/{total} 완료
      </p>
      <p className="text-[10px] text-slate-400 mt-1">
        작성 {entries}일 · 온타임 {onTime}
      </p>
    </div>
  );
}

function computeStats(
  entries: { date: Date; timelineTasks: { completedAt: Date | null; isOnTime: boolean | null }[] }[],
  fromDate: string,
  toDate: string
): Stats {
  const filtered = entries.filter((e) => {
    const d = formatDate(e.date);
    return d >= fromDate && d <= toDate;
  });
  let total = 0;
  let done = 0;
  let onTime = 0;
  for (const e of filtered) {
    for (const t of e.timelineTasks) {
      total++;
      if (t.completedAt) done++;
      if (t.isOnTime === true) onTime++;
    }
  }
  return { entries: filtered.length, total, done, onTime };
}

function computeStreak(entryDates: string[], today: string): number {
  const set = new Set(entryDates);
  let streak = 0;
  let cursor = today;
  while (set.has(cursor)) {
    streak++;
    const d = new Date(cursor + "T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseMandala(raw: unknown): MandalaData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { center?: unknown; goals?: unknown };
  if (typeof r.center !== "string" || !Array.isArray(r.goals) || r.goals.length !== 8) return null;
  const goals = r.goals.map((g) => {
    const obj = g as { title?: unknown; actions?: unknown };
    const title = typeof obj.title === "string" ? obj.title : "";
    const rawActions = Array.isArray(obj.actions) ? obj.actions : [];
    const actions: string[] = Array.from({ length: 8 }, (_, i) =>
      typeof rawActions[i] === "string" ? (rawActions[i] as string) : ""
    );
    return { title, actions };
  });
  return { center: r.center, goals };
}
