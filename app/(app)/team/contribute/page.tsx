import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostForm } from "./PostForm";
import { PostCard, type PostCardData } from "./PostCard";

export const dynamic = "force-dynamic";

export default async function ContributePage() {
  const me = await requireUser();

  const posts = await prisma.contributionPost.findMany({
    where: { type: "SKILL" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } },
      applications: {
        select: {
          id: true,
          applicantId: true,
          status: true,
        },
      },
    },
  });

  const cards: PostCardData[] = posts.map((p) => {
    const myApp = p.applications.find((a) => a.applicantId === me.id);
    const accepted = p.applications.filter((a) => a.status === "ACCEPTED" || a.status === "COMPLETED").length;
    const pending = p.applications.filter((a) => a.status === "PENDING").length;
    return {
      id: p.id,
      authorId: p.authorId,
      authorName: p.author.name,
      type: "SKILL",
      title: p.title,
      description: p.description,
      coinReward: p.coinReward,
      maxApplicants: p.maxApplicants,
      deadline: p.deadline,
      scheduledAt: p.scheduledAt,
      scheduleNote: p.scheduleNote,
      status: p.status,
      applicationsCount: accepted,
      pendingCount: pending,
      myApplication: myApp ? { id: myApp.id, status: myApp.status } : null,
    };
  });

  const open = cards.filter((c) => c.status === "OPEN");
  const closed = cards.filter((c) => c.status === "CLOSED");

  return (
    <>
      <PageHeader title="🤝 기여" subtitle={`${open.length}개 모집 중`} />
      <div className="px-5 py-5 space-y-4">
        <PostForm type="SKILL" />

        {cards.length === 0 && (
          <div
            className="rounded-2xl p-6 text-center text-sm"
            style={{
              background: "rgba(15,20,40,0.4)",
              border: "1px solid var(--line)",
              color: "var(--fg-muted)",
            }}
          >
            아직 등록된 기여가 없어요.
            <br />
            팀에 도움 줄 수 있는 일을 처음으로 등록해보세요.
          </div>
        )}

        {open.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--fg-muted)" }}>
              모집 중
            </h2>
            {open.map((p) => (
              <PostCard key={p.id} post={p} isAuthor={p.authorId === me.id} />
            ))}
          </section>
        )}

        {closed.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--fg-muted)" }}>
              마감됨
            </h2>
            {closed.map((p) => (
              <PostCard key={p.id} post={p} isAuthor={p.authorId === me.id} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
