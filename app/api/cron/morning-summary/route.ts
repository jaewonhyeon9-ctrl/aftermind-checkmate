import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { todayInTz, dateOnly } from "@/lib/dates";
import { getActivePushableMemberships } from "@/lib/program";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 매일 아침 발송되는 요약 푸시.
 * Vercel cron으로 호출 (UTC 23:00 = KST 08:00).
 * 위젯 흉내내기 (B): 사용자 잠금화면에 오늘의 계획 카드 표시.
 *
 * 내용: 오늘 타임라인 N개 + Must 3 진행 + 운영자 과제 K개 미완.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // DailyEntry/AssignedTask가 과정별로 스코프되므로 유저가 아닌 (유저, 과정) 멤버십 단위로 순회한다.
  const memberships = await getActivePushableMemberships();

  let pushed = 0;

  for (const m of memberships) {
    const tz = m.user.timezone || "Asia/Seoul";
    const today = todayInTz(tz);

    const [entry, pendingTaskCount] = await Promise.all([
      prisma.dailyEntry.findUnique({
        where: {
          userId_programId_date: { userId: m.userId, programId: m.programId, date: dateOnly(today) },
        },
        include: {
          timelineTasks: { select: { completedAt: true } },
          mustChecks: { select: { isCompleted: true } },
        },
      }),
      prisma.assignedTaskCompletion.count({
        where: {
          userId: m.userId,
          isCompleted: false,
          task: {
            programId: m.programId,
            OR: [{ dueDate: null }, { dueDate: { gte: dateOnly(today) } }],
          },
        },
      }),
    ]);

    const totalTimeline = entry?.timelineTasks.length ?? 0;
    const doneTimeline = entry?.timelineTasks.filter((t) => t.completedAt !== null).length ?? 0;
    const remainingTimeline = totalTimeline - doneTimeline;
    const totalMust = entry?.mustChecks.length ?? 0;
    const doneMust = entry?.mustChecks.filter((mc) => mc.isCompleted).length ?? 0;

    const badge = remainingTimeline + pendingTaskCount + (totalMust - doneMust);

    // 미작성자는 nag-incomplete 엔드포인트에서 별도로 처리 (중복 푸시 방지)
    if (!entry) continue;

    const parts: string[] = [];
    if (totalTimeline > 0) parts.push(`타임라인 ${doneTimeline}/${totalTimeline}`);
    if (totalMust > 0) parts.push(`Must ${doneMust}/${totalMust}`);
    if (pendingTaskCount > 0) parts.push(`과제 ${pendingTaskCount}개 남음`);
    const body = parts.length > 0 ? parts.join(" · ") : "오늘 할 일이 모두 정리됐어요!";

    await sendPushToUser(m.userId, {
      title: `☀️ ${m.user.name}님, 좋은 아침이에요`,
      body,
      url: "/today",
      tag: `morning-${today}-${m.programId}`,
      badge,
    });
    pushed++;
  }

  return NextResponse.json({ ok: true, pushed, totalMemberships: memberships.length });
}