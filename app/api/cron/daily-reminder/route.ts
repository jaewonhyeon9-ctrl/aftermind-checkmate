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
  // Vercel cron 자체 인증 또는 CRON_SECRET 검증
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron-signature") !== null;
  if (!isVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 활성 사용자 + 푸시 구독 있는 사람만
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      name: true,
      timezone: true,
    },
  });

  let reminded = 0;
  let summarized = 0;

  for (const u of users) {
    const tz = u.timezone || "Asia/Seoul";
    const today = todayInTz(tz);

    const entry = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: u.id, date: dateOnly(today) } },
      include: {
        timelineTasks: { select: { completedAt: true, isOnTime: true } },
        mustChecks: { select: { isCompleted: true } },
      },
    });

    if (!entry) {
      // 미작성자 → 리마인더
      await sendPushToUsers([u.id], {
        title: "🌙 데일리 리포트 작성",
        body: `${u.name}님, 아직 오늘의 리포트를 작성 안 했어요. 짧게라도 남겨보세요.`,
        url: "/today",
        tag: "daily-reminder",
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

    await sendPushToUsers([u.id], {
      title: `🌙 ${u.name}님 오늘 결산`,
      body,
      url: "/today",
      tag: `evening-${today}`,
      badge: remaining,
    });
    summarized++;
  }

  return NextResponse.json({ ok: true, reminded, summarized, totalUsers: users.length });
}
