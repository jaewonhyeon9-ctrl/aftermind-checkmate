import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken, sendToSelf } from "@/lib/kakao";
import { todayInTz, dateOnly, currentMonthKey } from "@/lib/dates";
import { getCurrentProgram } from "@/lib/program";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://aftermind-checkmate.vercel.app";

/**
 * 매일 저녁 카카오톡 일일 요약 발송 cron.
 * 사용자가 켜둔 채널(가계부, 오늘일정)을 한 번의 메시지로 묶어서 발송.
 *  - moneyEnabled: 오늘 + 이번 달 가계부 요약
 *  - todayPlanEnabled: 오늘의 타임라인 + Must3 진행 상황
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await prisma.kakaoIntegration.findMany({
    where: {
      OR: [{ moneyEnabled: true }, { todayPlanEnabled: true }],
    },
    include: {
      user: {
        select: { id: true, name: true, timezone: true, isActive: true },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const integ of integrations) {
    if (!integ.user.isActive) {
      skipped++;
      continue;
    }
    // KakaoIntegration은 유저 1:1이라 과정 정보가 없다 — 가장 최근 가입한 활성 과정을 기준으로 판단한다.
    // 과정이 없어도(오늘 일정 섹션만 건너뜀) moneyEnabled 요약은 과정과 무관하므로 그대로 발송한다.
    const program = integ.todayPlanEnabled ? await getCurrentProgram(integ.userId) : null;
    const tz = integ.user.timezone || "Asia/Seoul";
    const today = todayInTz(tz);
    const monthKey = currentMonthKey(tz);
    const monthStart = monthKey + "-01";
    const monthEnd = nextMonthStart(monthKey);

    try {
      const lines: string[] = [`🌙 ${integ.user.name}님 오늘 요약`, ""];

      if (integ.todayPlanEnabled && program) {
        const entry = await prisma.dailyEntry.findUnique({
          where: {
            userId_programId_date: { userId: integ.userId, programId: program.id, date: dateOnly(today) },
          },
          include: {
            timelineTasks: { orderBy: { order: "asc" } },
            mustChecks: { orderBy: { mustIndex: "asc" } },
          },
        });
        lines.push("📅 오늘 일정");
        if (!entry) {
          lines.push("- (아직 작성 안 함)");
        } else {
          const total = entry.timelineTasks.length;
          const done = entry.timelineTasks.filter((t) => t.completedAt).length;
          const onTime = entry.timelineTasks.filter((t) => t.isOnTime).length;
          if (total > 0) {
            lines.push(`- 타임라인 ${done}/${total} · 온타임 ${onTime}`);
          }
          const mustDone = entry.mustChecks.filter((m) => m.isCompleted).length;
          if (entry.must3.length > 0) {
            lines.push(`- MUST ${mustDone}/${entry.must3.length}`);
          }
          if (entry.oneThing) lines.push(`- 💎 ${entry.oneThing}`);
          if (total === 0 && entry.must3.length === 0) {
            lines.push("- (등록된 일정/MUST 없음)");
          }
        }
        lines.push("");
      }

      if (integ.moneyEnabled) {
        const [todayTxns, monthly] = await Promise.all([
          prisma.transaction.findMany({
            where: { userId: integ.userId, date: dateOnly(today) },
          }),
          prisma.transaction.findMany({
            where: {
              userId: integ.userId,
              date: { gte: dateOnly(monthStart), lt: dateOnly(monthEnd) },
            },
          }),
        ]);

        let todayIn = 0, todayOut = 0, monthIn = 0, monthOut = 0;
        for (const t of todayTxns) {
          if (t.type === "INCOME") todayIn += t.amount;
          else todayOut += t.amount;
        }
        for (const t of monthly) {
          if (t.type === "INCOME") monthIn += t.amount;
          else monthOut += t.amount;
        }

        lines.push("💰 가계부");
        lines.push(`- 오늘 지출 ${fmt(todayOut)}원${todayIn > 0 ? ` · 수입 ${fmt(todayIn)}원` : ""}`);
        lines.push(`- 이번 달 지출 ${fmt(monthOut)}원 · 잔액 ${fmt(monthIn - monthOut)}원`);
        lines.push("");
      }

      lines.push("앱에서 자세히 보기 ↓");
      const text = lines.join("\n").slice(0, 200);

      const accessToken = await getValidAccessToken(integ.userId);
      const url = integ.moneyEnabled && !integ.todayPlanEnabled
        ? `${APP_URL}/money`
        : `${APP_URL}/today`;
      await sendToSelf(accessToken, {
        text,
        linkUrl: url,
        buttonTitle: "체크메이트 열기",
      });
      await prisma.kakaoIntegration.update({
        where: { id: integ.id },
        data: { lastSentAt: new Date() },
      });
      sent++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${integ.user.name}: ${msg.slice(0, 100)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total: integrations.length,
    sent,
    skipped,
    failed,
    errors: errors.slice(0, 10),
  });
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function nextMonthStart(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}
