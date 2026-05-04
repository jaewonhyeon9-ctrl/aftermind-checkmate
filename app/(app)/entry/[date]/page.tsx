import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnly, todayInTz } from "@/lib/dates";
import { EntryForm } from "../../today/EntryForm";

type Params = { date: string };

export default async function EntryByDatePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const user = await requireUser();
  const tz = user.timezone || "Asia/Seoul";
  const today = todayInTz(tz);
  if (date === today) redirect("/today");

  const isPast = date < today;

  // 라벨 결정: 내일 / 모레 / 구체 날짜
  const dayDiff = daysBetween(today, date);
  const dayLabel =
    dayDiff === 1
      ? "내일"
      : dayDiff === 2
      ? "모레"
      : format(new Date(date + "T00:00:00"), "M월 d일", { locale: ko });

  const entry = await prisma.dailyEntry.findUnique({
    where: { userId_date: { userId: user.id, date: dateOnly(date) } },
    include: {
      timelineTasks: { orderBy: { order: "asc" } },
      mustChecks: { orderBy: { mustIndex: "asc" } },
    },
  });

  return (
    <>
      <PageHeader
        title={format(new Date(date + "T00:00:00"), "M월 d일 (EEE)", { locale: ko })}
        subtitle={
          isPast
            ? format(new Date(date + "T00:00:00"), "yyyy년 (지난 기록)", { locale: ko })
            : "내일 계획"
        }
        right={
          <Link
            href="/me"
            className="text-xs text-slate-600 inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> 기록
          </Link>
        }
      />
      <div className="px-5 py-5 space-y-4">
        {isPast ? (
          <PastView entry={entry} />
        ) : (
          <EntryForm
            date={date}
            mode="plan"
            dayLabel={dayLabel}
            initial={
              entry
                ? {
                    date,
                    wakeUpTime: entry.wakeUpTime,
                    workStartTime: entry.workStartTime,
                    smallWin: entry.smallWin,
                    insight: entry.insight,
                    gratitude: entry.gratitude,
                    must3: entry.must3,
                    nice3: entry.nice3,
                    variables: entry.variables,
                    oneThing: entry.oneThing,
                    cheerMessage: entry.cheerMessage,
                  }
                : null
            }
            initialTimeline={
              entry
                ? entry.timelineTasks
                    .filter((t) => t.completedAt === null)
                    .map((t) => ({
                      title: t.title,
                      startTime: t.startTime,
                      dueTime: t.dueTime,
                    }))
                : []
            }
          />
        )}
      </div>
    </>
  );
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00.000Z").getTime();
  const b = new Date(to + "T00:00:00.000Z").getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function PastView({
  entry,
}: {
  entry:
    | (NonNullable<Awaited<ReturnType<typeof prisma.dailyEntry.findUnique>>> & {
        timelineTasks: {
          id: string;
          title: string;
          startTime: string;
          dueTime: string;
          completedAt: Date | null;
          isOnTime: boolean | null;
        }[];
        mustChecks: { mustIndex: number; isCompleted: boolean; reason: string | null }[];
      })
    | null;
}) {
  if (!entry) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-500">이 날엔 작성된 데일리가 없어요.</p>
      </div>
    );
  }

  return (
    <>
      {entry.oneThing && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
          <p className="text-[11px] font-semibold text-amber-700">💎 ONE THING</p>
          <p className="mt-1 text-base text-amber-900">{entry.oneThing}</p>
        </div>
      )}

      <ReadOnlySection title="🕘 시간">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <KV k="기상" v={entry.wakeUpTime} />
          <KV k="출근" v={entry.workStartTime} />
        </div>
      </ReadOnlySection>

      {entry.timelineTasks.length > 0 && (
        <ReadOnlySection title="⏱️ 타임라인">
          <ul className="space-y-2">
            {entry.timelineTasks.map((t) => {
              const completed = t.completedAt !== null;
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <span
                    className={
                      "size-6 rounded-md flex items-center justify-center " +
                      (completed
                        ? t.isOnTime
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-white"
                        : "border border-slate-300")
                    }
                  >
                    {completed && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span
                    className={
                      "flex-1 text-sm " + (completed ? "line-through text-slate-400" : "")
                    }
                  >
                    {t.title}
                  </span>
                  <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                    <Clock size={11} /> {t.startTime}~{t.dueTime}
                  </span>
                </li>
              );
            })}
          </ul>
        </ReadOnlySection>
      )}

      {entry.must3.length > 0 && (
        <ReadOnlySection title="🔥 Must 3">
          <ul className="space-y-1">
            {entry.must3.map((m, i) => {
              const check = entry.mustChecks.find((c) => c.mustIndex === i);
              return (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-slate-400">{i + 1}.</span>
                  <div className="flex-1">
                    <p
                      className={
                        check?.isCompleted ? "line-through text-slate-400" : "text-slate-700"
                      }
                    >
                      {m}
                    </p>
                    {check?.reason && (
                      <p className="text-[11px] text-slate-500 mt-0.5">— {check.reason}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </ReadOnlySection>
      )}

      {entry.nice3.length > 0 && (
        <ReadOnlySection title="🌱 Nice 3">
          <ul className="space-y-1">
            {entry.nice3.map((m, i) => (
              <li key={i} className="text-sm text-slate-700">
                {i + 1}. {m}
              </li>
            ))}
          </ul>
        </ReadOnlySection>
      )}

      {entry.variables && (
        <ReadOnlySection title="❗ 변수 / 주의">
          <p className="text-sm text-slate-700">{entry.variables}</p>
        </ReadOnlySection>
      )}

      {(entry.smallWin || entry.insight) && (
        <ReadOnlySection title="✅ 회고">
          {entry.smallWin && (
            <div>
              <p className="text-[11px] font-semibold text-emerald-700">Small Win</p>
              <p className="text-sm text-slate-700 mt-0.5">{entry.smallWin}</p>
            </div>
          )}
          {entry.insight && (
            <div>
              <p className="text-[11px] font-semibold text-blue-700">Insight</p>
              <p className="text-sm text-slate-700 mt-0.5">{entry.insight}</p>
            </div>
          )}
        </ReadOnlySection>
      )}

      {entry.cheerMessage && (
        <p className="text-center text-sm text-slate-500 italic px-4">
          📣 {entry.cheerMessage}
        </p>
      )}
    </>
  );
}

function ReadOnlySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
      <h3 className="text-[11px] font-semibold text-slate-500">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{k}</p>
      <p className="text-slate-700">{v ?? "-"}</p>
    </div>
  );
}
