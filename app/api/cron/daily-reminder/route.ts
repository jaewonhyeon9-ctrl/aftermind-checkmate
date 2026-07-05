import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { todayInTz, dateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 매일 발송되는 데일리 리마인더.
 * Vercel cron으로 호출 (인증: Authorization: Bearer ${CRON_SECRET}).
 *
 * 사용자별 timezone에 맞춰 "오늘" 데일리 리포트 작성 안 한 사람에게 푸시.
 */
export async function GET(req: Request) {
  // Vercel cron 이 자동 주입하는 Authorization: Bearer ${CRON_SECRET} 검증
  // (단순 헤더 존재 체크는 우회 가능하므로 사용하지 않음)
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 활성 멤버십(과정별) + 푸시 구독 있는 사람만. DailyEntry가 과정별로 스코프되므로
  // 유저 단위가 아니라 (유저, 과정) 멤버십 단위로 순회한다.
  const memberships = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      program: { isActive: true },
      user: { isActive: true, pushSubscriptions: { some: {} } },
    },
    select: {
      userId: true,
      programId: true,
      user: { select: { name: true, timezone: true } },
    },
  });

  let reminded = 0;
  let summarized = 0;

  for (const m of memberships) {
    const tz = m.user.timezone || "Asia/Seoul";
    const today = todayInTz(tz);

    const entry = await prisma.dailyEntry.findUnique({
      where: {
        userId_programId_date: { userId: m.userId, programId: m.programId, date: dateOnly(today) },
      },
      include: {
        timelineTasks: { select: { completedAt: true, isOnTime: true } },
        mustChecks: { select: { isCompleted: true } },
      },
    });

    if (!entry) {
      // 미작성자 → 리마인더
      await sendPushToUsers([m.userId], {
        title: "🌙 데일리 리포트 작성",
        body: `${m.user.name}님, 아직 오늘의 리포트를 작성 안 했어요. 짧게라도 남겨보세요.`,
        url: "/today",
        tag: `daily-reminder-${m.programId}`,
      });
      reminded++;
      continue;
    }

    // 작성자 → 저녁 요약 (위젯 흉내내기 B)
    const totalTl = entry.timelineTasks.length;
    const doneTl = entry.timelineTasks.filter((t) => t.completedAt !== null).length;
    const onTimeTl = entry.timelineTasks.filter((t) => t.isOnTime === true).length;
    const totalMust = entry.mustChecks.length;
    const doneMust = entry.mustChecks.filter((m) => m.isCompleted).length;
    const remaining = (totalTl - doneTl) + (totalMust - doneMust);

    const pct = totalTl > 0 ? Math.round((doneTl / totalTl) * 100) : 0;
    const parts: string[] = [];
    if (totalTl > 0) parts.push(`타임라인 ${doneTl}/${totalTl} (${pct}%)`);
    if (onTimeTl > 0) parts.push(`온타임 ${onTimeTl}`);
    if (totalMust > 0) parts.push(`Must ${doneMust}/${totalMust}`);
    const body = parts.length > 0 ? parts.join(" · ") : "오늘 잘했어요!";

    await sendPushToUsers([m.userId], {
      title: `🌙 ${m.user.name}님 오늘 결산`,
      body,
      url: "/today",
      tag: `evening-${today}-${m.programId}`,
      badge: remaining,
    });
    summarized++;
  }

  return NextResponse.json({ ok: true, reminded, summarized, totalMemberships: memberships.length });
}
