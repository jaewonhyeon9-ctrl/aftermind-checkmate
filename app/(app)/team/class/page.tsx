import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostForm } from "../contribute/PostForm";
import { PostCard, type PostCardData } from "../contribute/PostCard";

export const dynamic = "force-dynamic";

export default async function ClassPage() {
  const me = await requireUser();

  const posts = await prisma.contributionPost.findMany({
    where: { type: "CLASS" },
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
      type: "CLASS",
      title: p.title,
      description: p.description,
      coinReward: p.coinReward,
      maxApplicants: p.maxApplicants,
      deadline: p.deadline,
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
      <PageHeader title="🎓 수업" subtitle={`${open.length}개 모집 중`} />
      <div className="px-5 py-5 space-y-4">
        <PostForm type="CLASS" />

        {cards.length === 0 && (
          <div
            className="rounded-2xl p-6 text-center text-sm"
            style={{
              background: "rgba(15,20,40,0.4)",
              border: "1px solid var(--line)",
              color: "var(--fg-muted)",
            }}
          >
            아직 개설된 수업이 없어요.
            <br />
            팀원들과 나누고 싶은 주제로 수업을 열어보세요.
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
              종료됨
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
