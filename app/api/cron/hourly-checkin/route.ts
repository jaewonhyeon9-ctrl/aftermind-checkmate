import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 매시간 정각 체크인 알림.
 * Vercel cron 으로 매시간 정각에 호출됨 ("0 * * * *").
 * CheckinConfig 의 startHour ~ endHour (Asia/Seoul) 범위 내에서만 발송.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config =
    (await prisma.checkinConfig.findUnique({ where: { id: 1 } })) ?? {
      id: 1,
      enabled: true,
      startHour: 9,
      endHour: 22,
    };

  if (!config.enabled) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  // 현재 시각의 KST hour 계산
  const kstHourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  const kstHour = Number(kstHourStr);

  if (kstHour < config.startHour || kstHour > config.endHour) {
    return NextResponse.json({ ok: true, skipped: "out_of_window", kstHour });
  }

  const userIds = (
    await prisma.user.findMany({
      where: { isActive: true, pushSubscriptions: { some: {} } },
      select: { id: true },
    })
  ).map((u) => u.id);

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, kstHour });
  }

  const hourLabel = `${String(kstHour).padStart(2, "0")}:00`;
  const result = await sendPushToUsers(userIds, {
    title: `📸 ${hourLabel} 체크인 시간`,
    body: "지금 뭐 하고 있어요? 사진 한 장 + 한 줄로 남겨주세요.",
    url: "/checkstagram",
    tag: `checkin-${kstHour}`,
  });

  return NextResponse.json({ ok: true, kstHour, ...result, targets: userIds.length });
}
