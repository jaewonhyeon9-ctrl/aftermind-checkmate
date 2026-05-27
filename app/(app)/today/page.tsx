import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayInTz, yesterdayInTz, tomorrowInTz, dateOnly } from "@/lib/dates";
import { EntryForm } from "./EntryForm";
import { MustCheckList } from "./MustCheckList";
import { Timeline } from "./Timeline";
import { ensureRoutinesCopied } from "./actions";
import { AssignedTasks } from "./AssignedTasks";
import { AlarmManager } from "./AlarmManager";
import { TodayMoneyCard } from "./TodayMoneyCard";
import { WelcomeInstallPrompt } from "@/components/InstallPrompt";
import { BadgeManager } from "@/components/BadgeManager";

export default async function TodayPage() {
  const user = await requireUser();

  const tz = user.timezone || "Asia/Seoul";
  const today = todayInTz(tz);
  const yesterday = yesterdayInTz(tz);
  const tomorrow = tomorrowInTz(tz);

  const [todayEntry, yEntry, myAssignments, todayTransactions] = await Promise.all([
    prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: user.id, date: dateOnly(today) } },
      include: {
        timelineTasks: { orderBy: { order: "asc" } },
        mustChecks: { orderBy: { mustIndex: "asc" } },
      },
    }),
    prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: user.id, date: dateOnly(yesterday) } },
      include: { mustChecks: { orderBy: { mustIndex: "asc" } } },
    }),
    prisma.assignedTaskCompletion.findMany({
      where: { userId: user.id },
      orderBy: [{ isCompleted: "asc" }, { task: { createdAt: "desc" } }],
      include: {
        task: {
          select: {
            id: true,
            scope: true,
            title: true,
            description: true,
            videoUrl: true,
            attachments: true,
            dueDate: true,
          },
        },
      },
      take: 20,
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, date: dateOnly(today) },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, category: true, amount: true, note: true },
    }),
  ]);

  // 오늘 entry의 must3가 있는데 MustCheck row 누락 → 자동 생성
  if (todayEntry && todayEntry.must3.length > 0 && todayEntry.mustChecks.length === 0) {
    await prisma.mustCheck.createMany({
      data: todayEntry.must3.map((text, i) => ({
        dailyEntryId: todayEntry.id,
        mustIndex: i,
        mustText: text,
      })),
    });
    todayEntry.mustChecks = await prisma.mustCheck.findMany({
      where: { dailyEntryId: todayEntry.id },
      orderBy: { mustIndex: "asc" },
    });
  }

  // 오늘 entry의 timeline 이 비어있으면 사용자의 가장 최근 isRoutine 항목들을 자동 복사
  if (todayEntry && todayEntry.timelineTasks.length === 0) {
    const copied = await ensureRoutinesCopied(todayEntry.id);
    if (copied > 0) {
      todayEntry.timelineTasks = await prisma.timelineTask.findMany({
        where: { dailyEntryId: todayEntry.id },
        orderBy: { order: "asc" },
      });
    }
  }

  // 어제 must3 동일 처리
  if (yEntry && yEntry.must3.length > 0 && yEntry.mustChecks.length === 0) {
    await prisma.mustCheck.createMany({
      data: yEntry.must3.map((text, i) => ({
        dailyEntryId: yEntry.id,
        mustIndex: i,
        mustText: text,
      })),
    });
    yEntry.mustChecks = await prisma.mustCheck.findMany({
      where: { dailyEntryId: yEntry.id },
      orderBy: { mustIndex: "asc" },
    });
  }

  // 위젯 흉내 (C): 앱 아이콘 배지 = 오늘 미완료 합계
  const badgeCount =
    (todayEntry?.timelineTasks.filter((t) => t.completedAt === null).length ?? 0) +
    (todayEntry?.mustChecks.filter((m) => !m.isCompleted).length ?? 0) +
    myAssignments.filter((a) => !a.isCompleted).length;

  return (
    <>
      <BadgeManager count={badgeCount} />
      <WelcomeInstallPrompt />
      <PageHeader
        title={`안녕, ${user.name}!`}
        subtitle={format(new Date(today + "T00:00:00"), "yyyy. M. d (EEE)", { locale: ko })}
        right={
          <div className="flex items-center gap-2">
            <AlarmManager tasks={todayEntry?.timelineTasks ?? []} />
            <Link
              href={`/entry/${tomorrow}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold"
            >
              <CalendarPlus size={13} /> 내일 계획
            </Link>
          </div>
        }
      />
      <div className="px-5 py-5 space-y-5">
        {myAssignments.length > 0 && <AssignedTasks items={myAssignments} />}

        <TodayMoneyCard items={todayTransactions} />

        <EntryForm
          date={today}
          mode="today"
          dayLabel="오늘"
          mustCheckSlot={
            todayEntry && todayEntry.mustChecks.length > 0 ? (
              <MustCheckList checks={todayEntry.mustChecks} variant="today" />
            ) : null
          }
          timelineSlot={
            todayEntry ? (
              <Timeline
                dailyEntryId={todayEntry.id}
                tasks={todayEntry.timelineTasks}
              />
            ) : null
          }
          initial={
            todayEntry
              ? {
                  date: today,
                  wakeUpTime: todayEntry.wakeUpTime,
                  workStartTime: todayEntry.workStartTime,
                  smallWin: todayEntry.smallWin,
                  insight: todayEntry.insight,
                  gratitude: todayEntry.gratitude,
                  must3: todayEntry.must3,
                  nice3: todayEntry.nice3,
                  variables: todayEntry.variables,
                  oneThing: todayEntry.oneThing,
                  cheerMessage: todayEntry.cheerMessage,
                }
              : null
          }
          initialTimeline={
            todayEntry
              ? todayEntry.timelineTasks
                  .filter((t) => t.completedAt === null)
                  .map((t) => ({
                    title: t.title,
                    startTime: t.startTime,
                    dueTime: t.dueTime,
                  }))
              : []
          }
        />

        {yEntry && yEntry.mustChecks.length > 0 && (
          <MustCheckList checks={yEntry.mustChecks} variant="yesterday" />
        )}
      </div>
    </>
  );
}
