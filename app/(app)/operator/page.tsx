import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { requireOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamMemberList } from "./TeamMemberList";
import { AssignTaskForm } from "./AssignTaskForm";
import { AssignedTaskList } from "./AssignedTaskList";
import { CheckinConfigCard } from "./CheckinConfigCard";

export default async function OperatorPage() {
  const me = await requireOperator();

  const [members, tasks, checkinConfig] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "desc" }, { name: "asc" }],
    }),
    prisma.assignedTask.findMany({
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
    prisma.checkinConfig.findUnique({ where: { id: 1 } }),
  ]);

  const cfg = checkinConfig ?? { enabled: true, startHour: 9, endHour: 22 };

  return (
    <>
      <PageHeader title="운영자" subtitle="팀원 관리 · 과제 부여" />
      <div className="px-5 py-5 space-y-6">
        <Section title="📸 체크인 알림 설정" subtitle="시작/종료 시각 안에서 매 정각에 알림 발송">
          <CheckinConfigCard
            initial={{ enabled: cfg.enabled, startHour: cfg.startHour, endHour: cfg.endHour }}
          />
        </Section>

        <Section title="📋 과제 부여" subtitle="전체 또는 개별 팀원에게 과제를 내릴 수 있어요">
          <AssignTaskForm
            members={members
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

        <Section title="👥 팀원" subtitle={`${members.length}명`}>
          <TeamMemberList members={members} myId={me.id} />
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
