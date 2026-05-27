import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Coins, Calendar, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationActions } from "./ApplicationActions";
import { MyApplicationMessage } from "./MyApplicationMessage";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const post = await prisma.contributionPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      applications: {
        include: {
          applicant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!post) notFound();

  const isAuthor = post.authorId === me.id;
  const myApp = post.applications.find((a) => a.applicantId === me.id);

  const groups = {
    PENDING: post.applications.filter((a) => a.status === "PENDING"),
    ACCEPTED: post.applications.filter((a) => a.status === "ACCEPTED"),
    COMPLETED: post.applications.filter((a) => a.status === "COMPLETED"),
    REJECTED: post.applications.filter((a) => a.status === "REJECTED"),
  };

  const sectionLabel = post.type === "CLASS" ? "수업" : "기여";

  return (
    <>
      <PageHeader
        title={post.title}
        subtitle={`${sectionLabel} · by ${post.author.name}`}
        right={
          <Link
            href={post.type === "CLASS" ? "/team/class" : "/team/contribute"}
            className="text-xs"
            style={{ color: "var(--fg-muted)" }}
          >
            <ChevronLeft size={16} className="inline" />
            목록
          </Link>
        }
      />
      <div className="px-5 py-5 space-y-4">
        {/* 게시글 카드 */}
        <article
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: "rgba(15,20,40,0.5)",
            border: "1px solid var(--line)",
          }}
        >
          {post.description && (
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--fg-dim)" }}>
              {post.description}
            </p>
          )}

          {post.type === "CLASS" && (post.scheduledAt || post.scheduleNote) && (
            <div
              className="rounded-lg p-3 space-y-1"
              style={{
                background: "rgba(177,255,66,0.08)",
                border: "1px solid rgba(177,255,66,0.2)",
              }}
            >
              <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--accent-lime)" }}>
                ⏰ 수업 일정
              </p>
              {post.scheduledAt && (
                <p className="text-sm font-bold" style={{ color: "var(--accent-lime)" }}>
                  {(() => {
                    const d = post.scheduledAt;
                    const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                    const pad = (n: number) => String(n).padStart(2, "0");
                    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${dow}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  })()}
                </p>
              )}
              {post.scheduleNote && (
                <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--fg-dim)" }}>
                  {post.scheduleNote}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--fg-muted)" }}>
            {post.coinReward > 0 && (
              <span className="inline-flex items-center gap-1" style={{ color: "var(--accent-lime)" }}>
                <Coins size={12} />
                보상 {post.coinReward.toLocaleString("ko-KR")} 에마
              </span>
            )}
            {post.maxApplicants && (
              <span className="inline-flex items-center gap-1">
                <Users size={12} />
                정원 {post.maxApplicants}명
              </span>
            )}
            {post.deadline && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                {post.deadline.toISOString().slice(0, 10)} 마감
              </span>
            )}
            <span
              className={
                "px-1.5 rounded text-[10px] " +
                (post.status === "OPEN" ? "bg-emerald-900/40 text-emerald-300" : "bg-slate-700 text-slate-300")
              }
            >
              {post.status === "OPEN" ? "모집 중" : "마감"}
            </span>
          </div>
        </article>

        {/* 본인 신청 상태 (작성자 아닌 경우) */}
        {!isAuthor && myApp && (
          <div
            className="rounded-xl p-3 text-sm space-y-2"
            style={{
              background: "rgba(0,224,255,0.08)",
              border: "1px solid rgba(0,224,255,0.2)",
            }}
          >
            <p className="font-semibold" style={{ color: "var(--accent-cyan)" }}>내 신청 상태</p>
            <p className="text-xs" style={{ color: "var(--accent-cyan)" }}>
              {myApp.status === "PENDING" && "⏳ 대기 중"}
              {myApp.status === "ACCEPTED" && "✓ 승인됨"}
              {myApp.status === "REJECTED" && "✗ 반려됨"}
              {myApp.status === "COMPLETED" && "🎉 완료 (보상 수령 완료)"}
            </p>
            <MyApplicationMessage
              applicationId={myApp.id}
              initialMessage={myApp.message}
              status={myApp.status}
            />
          </div>
        )}

        {/* 작성자 전용: 신청자 관리 */}
        {isAuthor && (
          <>
            {(["PENDING", "ACCEPTED", "COMPLETED", "REJECTED"] as const).map((status) => {
              const apps = groups[status];
              if (apps.length === 0) return null;
              const labels = {
                PENDING: { title: "⏳ 신청 대기", color: "var(--accent-cyan)" },
                ACCEPTED: { title: "✓ 승인됨 (보상 지급 대기)", color: "var(--accent-lime)" },
                COMPLETED: { title: "🎉 완료", color: "var(--accent-violet)" },
                REJECTED: { title: "✗ 반려", color: "var(--fg-muted)" },
              };
              return (
                <section key={status} className="space-y-2">
                  <h2 className="text-xs font-semibold tracking-wider" style={{ color: labels[status].color }}>
                    {labels[status].title} ({apps.length})
                  </h2>
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-xl p-3 space-y-2"
                      style={{
                        background: "rgba(15,20,40,0.5)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                          {app.applicant.name}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                          {app.createdAt.toISOString().slice(5, 10)}
                        </span>
                      </div>
                      {app.message && (
                        <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--fg-dim)" }}>
                          "{app.message}"
                        </p>
                      )}
                      <ApplicationActions
                        applicationId={app.id}
                        status={app.status}
                        coinReward={post.coinReward}
                        applicantName={app.applicant.name}
                      />
                    </div>
                  ))}
                </section>
              );
            })}
            {post.applications.length === 0 && (
              <div
                className="rounded-xl p-6 text-center text-sm"
                style={{
                  background: "rgba(15,20,40,0.4)",
                  border: "1px solid var(--line)",
                  color: "var(--fg-muted)",
                }}
              >
                아직 신청자가 없어요.
              </div>
            )}
          </>
        )}

        {/* 신청자 명단 (작성자 아닌 경우 — 등록자만 일부 공개) */}
        {!isAuthor && post.type === "CLASS" && groups.ACCEPTED.length + groups.COMPLETED.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
              등록자 ({groups.ACCEPTED.length + groups.COMPLETED.length})
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {[...groups.ACCEPTED, ...groups.COMPLETED].map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-1 rounded-lg text-xs"
                  style={{
                    background: "rgba(15,20,40,0.6)",
                    border: "1px solid var(--line)",
                    color: "var(--fg-dim)",
                  }}
                >
                  {a.applicant.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
