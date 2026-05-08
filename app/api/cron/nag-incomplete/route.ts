import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { todayInTz, dateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 오늘 데일리 리포트가 미작성/미완성인 사용자에게 알림.
 * 외부 스케줄러(GitHub Actions)에서 8/11/14/17/20시 KST마다 호출.
 *
 * 인증: Authorization: Bearer ${CRON_SECRET}
 *
 * 미완성 기준 (전날 미리 보상 받을 자격과 동일):
 *  - 기상시간 / Must 3 (3개) / Nice 3 (3개) / One Thing / 타임라인 1개+ 중 하나라도 빠지면 미완성
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      pushSubscriptions: { some: {} },
    },
    select: { id: true, name: true, timezone: true },
  });

  let nagged = 0;
  let skipped = 0;

  for (const u of users) {
    const tz = u.timezone || "Asia/Seoul";
    const today = todayInTz(tz);

    const entry = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: u.id, date: dateOnly(today) } },
      include: {
        timelineTasks: { select: { id: true } },
      },
    });

    const complete =
      !!entry &&
      !!entry.wakeUpTime?.trim() &&
      entry.must3.length === 3 &&
      entry.must3.every((s) => s.trim()) &&
      entry.nice3.length === 3 &&
      entry.nice3.every((s) => s.trim()) &&
      !!entry.oneThing?.trim() &&
      entry.timelineTasks.length >= 1;

    if (complete) {
      skipped++;
      continue;
    }

    await sendPushToUser(u.id, {
      title: "📋 오늘 일정 작성 부탁드려요",
      body: "일정이 등록되지 않았습니다. 성공적인 에프터마인드를 위해 꼭 작성해주세요.",
      url: "/today",
      tag: `nag-${today}`,
    });
    nagged++;
  }

  return NextResponse.json({ ok: true, nagged, skipped, totalUsers: users.length });
}
