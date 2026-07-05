import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Camera } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireUserWithProgram } from "@/lib/program";
import { prisma } from "@/lib/prisma";
import { CheckinForm } from "../checkin/CheckinForm";
import { CheckinCard } from "../checkin/CheckinCard";

export const dynamic = "force-dynamic";

function currentKstHour(): Date {
  const ms = 60 * 60 * 1000;
  const kstNow = Date.now() + 9 * ms;
  const kstHourFloor = Math.floor(kstNow / ms) * ms;
  return new Date(kstHourFloor - 9 * ms);
}

export default async function CheckgramPage() {
  const { user: me, program } = await requireUserWithProgram();
  const hour = currentKstHour();

  const [myThisHour, feed, totalCount, config, operatorMemberships] = await Promise.all([
    prisma.hourlyCheckin.findUnique({
      where: { userId_programId_hour: { userId: me.id, programId: program.id, hour } },
    }),
    prisma.hourlyCheckin.findMany({
      where: { programId: program.id },
      orderBy: { hour: "desc" },
      include: { user: { select: { id: true, name: true } } },
      take: 100,
    }),
    prisma.hourlyCheckin.count({ where: { programId: program.id } }),
    prisma.checkinConfig.findUnique({ where: { programId: program.id } }),
    prisma.membership.findMany({
      where: { programId: program.id, role: "OPERATOR" },
      select: { userId: true },
    }),
  ]);
  const operatorIds = new Set(operatorMemberships.map((m) => m.userId));

  const hourLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(hour);

  // 날짜별 그룹핑 (인스타 스토리 구분처럼)
  const groups = new Map<string, typeof feed>();
  for (const c of feed) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(c.hour);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <>
      <PageHeader
        title="📸 체크스타그램"
        subtitle={`${format(hour, "M월 d일 (EEE)", { locale: ko })} · ${hourLabel} 정각`}
        right={
          <span className="text-[11px] text-slate-500 mono">
            총 {totalCount.toLocaleString("ko-KR")}장
          </span>
        }
      />
      <div className="px-5 py-5 space-y-6">
        {/* 상단 컴포저 */}
        <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-cyan-200">지금 뭐 하고 있어요?</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                사진 1장 + 한 줄 · 정각마다 올리면 <b className="text-amber-300">+50 에마</b>
              </p>
            </div>
            {myThisHour && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                이번 정각 완료
              </span>
            )}
          </div>
          <CheckinForm hasExisting={!!myThisHour} />
          {config && !config.enabled && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">
              ⚠️ 현재 운영자가 정각 알림을 꺼둔 상태입니다 (직접 올리는 건 가능).
            </p>
          )}
        </section>

        {/* 피드 — 인스타식 */}
        {feed.length === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-3">
            <div className="size-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-white flex items-center justify-center">
              <Camera size={26} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">아직 비어있어요</p>
              <p className="text-[11px] text-slate-400 mt-1">
                팀에서 가장 먼저 올리는 사람이 되어보세요.
                <br />첫 사진을 올리면 +50 에마.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            {[...groups.entries()].map(([dateKey, items]) => {
              const isToday = dateKey === new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Seoul",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date());
              const label = isToday
                ? "오늘"
                : format(new Date(dateKey + "T00:00:00.000Z"), "M월 d일 (EEE)", { locale: ko });

              return (
                <div key={dateKey} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <h4 className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                      {label}
                    </h4>
                    <span className="text-[10px] text-slate-500 mono">
                      {items.length}장
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="space-y-3">
                    {items.map((c) => (
                      <CheckinCard
                        key={c.id}
                        id={c.id}
                        userName={c.user.name}
                        isOperator={operatorIds.has(c.userId)}
                        isMe={c.userId === me.id}
                        hour={c.hour}
                        photoUrl={c.photoUrl}
                        message={c.message}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}
