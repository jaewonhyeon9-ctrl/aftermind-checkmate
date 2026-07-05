import { PageHeader } from "@/components/PageHeader";
import { requireOperatorWithProgram } from "@/lib/program";
import { prisma } from "@/lib/prisma";
import { TeamMemberList } from "./TeamMemberList";
import { PendingApprovals } from "./PendingApprovals";
import { JoinLinkCard } from "./JoinLinkCard";
import { AssignTaskForm } from "./AssignTaskForm";
import { AssignedTaskList } from "./AssignedTaskList";
import { CheckinConfigCard } from "./CheckinConfigCard";
import { AnnouncementPanel } from "./AnnouncementPanel";
import { BroadcastTimelineForm } from "./BroadcastTimelineForm";

export default async function OperatorPage() {
  const { user: me, program } = await requireOperatorWithProgram();

  const [memberships, tasks, checkinConfig, announcements] = await Promise.all([
    prisma.membership.findMany({
      where: { programId: program.id },
      orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.assignedTask.findMany({
      where: { programId: program.id },
      orderBy: [{ createdAt: "desc" }],
      include: {
        creator: { select: { id: true, name: true } },
        completions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.checkinConfig.findUnique({ where: { programId: program.id } }),
    prisma.announcement.findMany({
      where: { programId: program.id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { id: true, name: true } } },
      take: 30,
    }),
  ]);

  const cfg = checkinConfig ?? { enabled: true, startHour: 9, endHour: 22 };

  const pendingMemberships = memberships
    .filter((m) => m.status === "PENDING")
    .map((m) => ({ userId: m.user.id, name: m.user.name, email: m.user.email }));

  // 승인됐거나(활성/비활성) 이전에 활성이었던 팀원만 로스터에 표시. 대기중(PENDING)은 위 섹션에서 별도 처리.
  const rosterMembers = memberships
    .filter((m) => m.status !== "PENDING")
    .map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      isActive: m.status === "ACTIVE",
    }));

  return (
    <>
      <PageHeader title="운영자" subtitle={`${program.name} — 팀원 관리 · 과제 부여`} />
      <div className="px-5 py-5 space-y-6">
        <Section title="🔗 팀원 초대" subtitle="가입 링크를 공유하고, 신청이 오면 아래에서 승인하세요">
          <JoinLinkCard slug={program.slug} />
        </Section>

        <Section title="🙋 가입 대기" subtitle={`${pendingMemberships.length}명 대기 중`}>
          <PendingApprovals pending={pendingMemberships} />
        </Section>

        <Section title="📢 공지사항" subtitle="체크 없는 정보용 게시물 — 팀원 오늘 화면 상단에 표시">
          <AnnouncementPanel announcements={announcements} myId={me.id} />
        </Section>

        <Section title="🗓 팀원 일정 일괄 추가" subtitle="모든 활성 팀원의 해당 날짜 타임라인에 동일 일정을 한 번에 추가">
          <BroadcastTimelineForm memberCount={rosterMembers.filter((m) => m.isActive).length} />
        </Section>

        <Section title="📸 체크인 알림 설정" subtitle="시작/종료 시각 안에서 매 정각에 알림 발송">
          <CheckinConfigCard
            initial={{ enabled: cfg.enabled, startHour: cfg.startHour, endHour: cfg.endHour }}
          />
        </Section>

        <Section title="📋 과제 부여" subtitle="전체 또는 개별 팀원에게 과제를 내릴 수 있어요">
          <AssignTaskForm
            members={rosterMembers
              .filter((m) => m.isActive)
              .map((m) => ({ id: m.id, name: m.name, role: m.role }))}
          />
        </Section>

        <Section
          title="✅ 진행 중인 과제"
          subtitle={`${tasks.length}개 과제`}
        >
          <AssignedTaskList tasks={tasks} myId={me.id} />
        </Section>

        <Section title="👥 팀원" subtitle={`${rosterMembers.length}명`}>
          <TeamMemberList members={rosterMembers} myId={me.id} />
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}