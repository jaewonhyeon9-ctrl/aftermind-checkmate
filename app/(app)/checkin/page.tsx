import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckinForm } from "./CheckinForm";
import { CheckinCard } from "./CheckinCard";

export const dynamic = "force-dynamic";

function currentKstHour(): Date {
  const ms = 60 * 60 * 1000;
  const kstNow = Date.now() + 9 * ms;
  const kstHourFloor = Math.floor(kstNow / ms) * ms;
  return new Date(kstHourFloor - 9 * ms);
}

export default async function CheckinPage() {
  const me = await requireUser();
  const hour = currentKstHour();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [myThisHour, recent, config] = await Promise.all([
    prisma.hourlyCheckin.findUnique({
      where: { userId_hour: { userId: me.id, hour } },
    }),
    prisma.hourlyCheckin.findMany({
      where: { hour: { gte: since } },
      orderBy: { hour: "desc" },
      include: { user: { select: { id: true, name: true, role: true } } },
      take: 60,
    }),
    prisma.checkinConfig.findUnique({ where: { id: 1 } }),
  ]);

  const hourLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(hour);

  return (
    <>
      <PageHeader
        title="📸 체크인"
        subtitle={`${format(hour, "M월 d일 (EEE)", { locale: ko })} · ${hourLabel} 정각`}
      />
      <div className="px-5 py-5 space-y-5">
        <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-cyan-200">지금 뭐 하고 있어요?</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                사진 1장 + 한 줄 · 올리면 <b className="text-amber-300">50 에마</b> 지급
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
              ⚠️ 현재 운영자가 정각 알림을 꺼둔 상태입니다 (체크인 직접 등록은 가능).
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 px-1">최근 24시간 · 팀 체크인</h3>
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-slate-400">
              아직 올라온 체크인이 없어요.
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((c) => (
                <CheckinCard
                  key={c.id}
                  id={c.id}
                  userName={c.user.name}
                  isOperator={c.user.role === "OPERATOR"}
                  isMe={c.userId === me.id}
                  hour={c.hour}
                  photoUrl={c.photoUrl}
                  message={c.message}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
