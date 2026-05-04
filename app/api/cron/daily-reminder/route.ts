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

  let pushed = 0;
  let skipped = 0;

  for (const u of users) {
    const tz = u.timezone || "Asia/Seoul";
    const today = todayInTz(tz);

    // 오늘 entry 작성 여부
    const entry = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: u.id, date: dateOnly(today) } },
      select: { id: true },
    });

    if (entry) {
      skipped++;
      continue;
    }

    await sendPushToUsers([u.id], {
      title: "🌙 데일리 리포트 작성",
      body: `${u.name}님, 아직 오늘의 리포트를 작성 안 했어요. 짧게라도 남겨보세요.`,
      url: "/today",
      tag: "daily-reminder",
    });
    pushed++;
  }

  return NextResponse.json({ ok: true, pushed, skipped, totalUsers: users.length });
}
