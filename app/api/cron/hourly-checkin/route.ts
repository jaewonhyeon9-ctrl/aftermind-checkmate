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

  // 현재 시각의 KST hour 계산
  const kstHourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  const kstHour = Number(kstHourStr);
  const hourLabel = `${String(kstHour).padStart(2, "0")}:00`;

  // 과정(Program)마다 알림 시간대·발송 대상이 독립적이므로 과정별로 순회한다.
  const programs = await prisma.program.findMany({
    where: { isActive: true },
    select: { id: true, checkinConfig: true },
  });

  let totalSent = 0;
  let totalTargets = 0;
  const perProgram: Record<string, unknown> = {};

  for (const program of programs) {
    const config = program.checkinConfig ?? { enabled: true, startHour: 9, endHour: 22 };
    if (!config.enabled) {
      perProgram[program.id] = { skipped: "disabled" };
      continue;
    }
    if (kstHour < config.startHour || kstHour > config.endHour) {
      perProgram[program.id] = { skipped: "out_of_window" };
      continue;
    }

    const userIds = (
      await prisma.membership.findMany({
        where: {
          programId: program.id,
          status: "ACTIVE",
          user: { isActive: true, pushSubscriptions: { some: {} } },
        },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    if (userIds.length === 0) {
      perProgram[program.id] = { sent: 0 };
      continue;
    }

    const result = await sendPushToUsers(userIds, {
      title: `📸 ${hourLabel} 체크인 시간`,
      body: "지금 뭐 하고 있어요? 사진 한 장 + 한 줄로 남겨주세요.",
      url: "/checkstagram",
      tag: `checkin-${program.id}-${kstHour}`,
    });
    totalSent += result.sent;
    totalTargets += userIds.length;
    perProgram[program.id] = { ...result, targets: userIds.length };
  }

  return NextResponse.json({ ok: true, kstHour, totalSent, totalTargets, perProgram });
}
