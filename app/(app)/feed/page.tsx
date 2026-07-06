import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Check, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireUserWithProgram } from "@/lib/program";
import { prisma } from "@/lib/prisma";
import { todayInTz, tomorrowInTz, dateOnly } from "@/lib/dates";
import { Timeline } from "../today/Timeline";

export default async function FeedPage() {
  const { user: me, program } = await requireUserWithProgram();
  const tz = me.timezone || "Asia/Seoul";
  const today = todayInTz(tz);
  const tomorrow = tomorrowInTz(tz);
  const todayDate = dateOnly(today);

  const [memberships, assignmentsToday] = await Promise.all([
    prisma.membership.findMany({
      where: { programId: program.id, status: "ACTIVE", user: { isActive: true } },
      orderBy: [{ role: "desc" }, { user: { name: "asc" } }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            finalGoal: true,
            dailyEntries: {
              where: { date: todayDate, programId: program.id },
              include: {
                timelineTasks: { orderBy: { order: "asc" } },
                mustChecks: { orderBy: { mustIndex: "asc" } },
              },
            },
          },
        },
      },
    }),
    prisma.assignedTaskCompletion.findMany({
      where: {
        task: {
          programId: program.id,
          OR: [{ dueDate: null }, { dueDate: { gte: todayDate } }],
        },
      },
      select: {
        userId: true,
        isCompleted: true,
      },
    }),
  ]);

  const members = memberships.map((m) => ({ ...m.user, role: m.role }));

  // userId → { total, done }
  const assignByUser = new Map<string, { total: number; done: number }>();
  for (const a of assignmentsToday) {
    const cur = assignByUser.get(a.userId) ?? { total: 0, done: 0 };
    cur.total++;
    if (a.isCompleted) cur.done++;
    assignByUser.set(a.userId, cur);
  }

  const writtenCount = members.filter((m) => m.dailyEntries.length > 0).length;

  return (
    <>
      <PageHeader
        title="팀 피드"
        subtitle={format(new Date(today + "T00:00:00"), "yyyy. M. d (EEE)", { locale: ko })}
        right={
          <span className="text-[11px] text-slate-500">
            {writtenCount}/{members.length} 작성
          </span>
        }
      />
      <div className="px-5 py-5 space-y-3">
        {members.length === 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-5 text-sm text-slate-500 text-center">
            아직 팀원이 없어요.
          </div>
        )}
        {members.map((m) => {
          const entry = m.dailyEntries[0];
          const isMe = m.id === me.id;
          const assigns = assignByUser.get(m.id) ?? { total: 0, done: 0 };
          return (
            <MemberCard
              key={m.id}
              member={m}
              entry={entry}
              isMe={isMe}
              assignments={assigns}
              tomorrow={tomorrow}
            />
          );
        })}
      </div>
    </>
  );
}

type MemberCardProps = {
  member: {
    id: string;
    name: string;
    role: "OPERATOR" | "MEMBER";
    finalGoal: string | null;
  };
  entry?: {
    id: string;
    wakeUpTime: string | null;
    must3: string[];
    nice3: string[];
    variables: string | null;
    oneThing: string | null;
    cheerMessage: string | null;
    smallWin: string | null;
    insight: string | null;
    timelineTasks: {
      id: string;
      title: string;
      startTime: string;
      dueTime: string;
      completedAt: Date | null;
      isOnTime: boolean | null;
      memo: string | null;
      order: number;
      isRoutine: boolean;
    }[];
    mustChecks: {
      id: string;
      mustIndex: number;
      mustText: string;
      isCompleted: boolean;
      memo: string | null;
      reason: string | null;
    }[];
  };
  isMe: boolean;
  assignments: { total: number; done: number };
  tomorrow: string;
};

function MemberCard({ member, entry, isMe, assignments, tomorrow }: MemberCardProps) {
  const initial = member.name.charAt(0);
  const total = entry?.timelineTasks.length ?? 0;
  const done = entry?.timelineTasks.filter((t) => t.completedAt !== null).length ?? 0;
  const onTime = entry?.timelineTasks.filter((t) => t.isOnTime === true).length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <article className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <div className="p-4 space-y-3">
        <header className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              {member.name}
              {member.role === "OPERATOR" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">
                  운영자
                </span>
              )}
              {isMe && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  나
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500">
              {entry ? (
                <>
                  기상 {entry.wakeUpTime ?? "-"}
                  {entry.cheerMessage && (
                    <> · 📣 {entry.cheerMessage}</>
                  )}
                </>
              ) : (
                <span className="text-slate-400">아직 작성 안 함</span>
              )}
            </p>
          </div>
        </header>

        {member.finalGoal && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
            <p className="text-[10px] font-semibold text-amber-700">🎯 최종 목표</p>
            <p className="text-xs text-amber-900 mt-0.5">{member.finalGoal}</p>
          </div>
        )}

        {entry?.oneThing && (
          <div className="rounded-xl bg-slate-900 text-white px-3 py-2.5">
            <p className="text-[10px] font-semibold text-slate-300 tracking-wide">💎 ONE THING</p>
            <p className="text-sm mt-0.5">{entry.oneThing}</p>
          </div>
        )}

        {entry && entry.must3.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 mb-1">🔥 MUST 3</p>
            <ul className="space-y-0.5">
              {entry.must3.map((m, i) => {
                const check = entry.mustChecks.find((c) => c.mustIndex === i);
                const done = check?.isCompleted ?? false;
                return (
                  <li key={i} className="text-xs flex items-center gap-1.5">
                    <span
                      className={
                        "size-3.5 rounded-sm flex items-center justify-center flex-shrink-0 " +
                        (done ? "bg-emerald-500 text-white" : "border border-slate-300")
                      }
                    >
                      {done && <Check size={9} strokeWidth={3} />}
                    </span>
                    <span className={done ? "line-through text-slate-400" : "text-slate-700"}>
                      {m}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {entry && entry.nice3.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 mb-1">🌱 NICE 3</p>
            <ul className="space-y-0.5">
              {entry.nice3.map((n, i) => (
                <li key={i} className="text-xs text-slate-600">
                  {i + 1}. {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {entry?.variables && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 mb-1">❗ 변수</p>
            <p className="text-xs text-slate-600">{entry.variables}</p>
          </div>
        )}

        {entry && entry.timelineTasks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 mb-1">⏱️ 타임라인</p>
            {isMe ? (
              <Timeline dailyEntryId={entry.id} tasks={entry.timelineTasks} hideAdd />
            ) : (
              <ul className="space-y-1">
                {entry.timelineTasks.map((t) => {
                  const completed = t.completedAt !== null;
                  return (
                    <li key={t.id} className="flex items-center gap-2 text-xs">
                      <span
                        className={
                          "size-4 rounded-sm flex items-center justify-center flex-shrink-0 " +
                          (completed
                            ? t.isOnTime
                              ? "bg-emerald-500 text-white"
                              : "bg-amber-500 text-white"
                            : "border border-slate-300")
                        }
                      >
                        {completed && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className={completed ? "line-through text-slate-400" : "text-slate-700"}>
                        {t.title}
                      </span>
                      <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5 ml-auto">
                        <Clock size={9} />
                        {t.startTime}~{t.dueTime}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {(entry?.smallWin || entry?.insight) && (
          <div className="grid grid-cols-1 gap-1 pt-1 border-t border-slate-100">
            {entry.smallWin && (
              <div className="text-xs text-slate-600">
                <span className="text-emerald-600 font-medium">✓ Small Win </span>
                {entry.smallWin}
              </div>
            )}
            {entry.insight && (
              <div className="text-xs text-slate-600">
                <span className="text-blue-600 font-medium">💡 Insight </span>
                {entry.insight}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 자동 일간 리포트 */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
            오늘의 리포트
          </p>
          <p className="text-xs font-bold text-slate-900">{pct}%</p>
        </div>
        <div className="h-1 rounded-full bg-slate-200 overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <ReportCell label="작성" value={entry ? "✓" : "✗"} highlight={!!entry} />
          <ReportCell label="타임라인" value={`${done}/${total}`} sub={onTime > 0 ? `온타임 ${onTime}` : undefined} />
          <ReportCell
            label="과제"
            value={`${assignments.done}/${assignments.total}`}
            sub={assignments.total === 0 ? "없음" : undefined}
          />
        </div>
        {!entry && isMe && (
          <Link
            href={`/entry/${tomorrow}`}
            className="mt-3 block text-center text-[11px] text-slate-600 hover:text-slate-900 underline underline-offset-2"
          >
            아직 안 썼다면 → 내일 미리 계획하기
          </Link>
        )}
      </div>
    </article>
  );
}

function ReportCell({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={"text-sm font-bold " + (highlight ? "text-emerald-600" : "text-slate-900")}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-slate-500">{sub}</p>}
    </div>
  );
}
