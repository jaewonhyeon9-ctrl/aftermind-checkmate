import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken, sendToSelf } from "@/lib/kakao";
import { todayInTz, dateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://aftermind-checkmate.vercel.app";

/**
 * 매일 카카오톡 리마인더 cron.
 *  - Vercel cron 또는 Bearer ${CRON_SECRET}로 인증
 *  - dailyReminderEnabled=true 인 사용자 중, 오늘 데일리 작성 안 한 사람에게 카톡 발송
 *  - 사용자 timezone 기준 "오늘"
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron-signature") !== null;
  if (!isVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await prisma.kakaoIntegration.findMany({
    where: { dailyReminderEnabled: true },
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
    const tz = integ.user.timezone || "Asia/Seoul";
    const today = todayInTz(tz);

    // 오늘 entry 작성 여부
    const entry = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: integ.userId, date: dateOnly(today) } },
      select: { id: true },
    });
    if (entry) {
      skipped++;
      continue;
    }

    try {
      const accessToken = await getValidAccessToken(integ.userId);
      await sendToSelf(accessToken, {
        text: `🌙 ${integ.user.name}님, 오늘의 데일리 리포트 아직이에요. 짧게라도 작성해 보세요. (오늘이 지나면 사라져요)`,
        linkUrl: `${APP_URL}/today`,
        buttonTitle: "리포트 쓰러 가기",
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
