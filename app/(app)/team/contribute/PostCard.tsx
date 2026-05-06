"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Coins, Users, Clock, Pencil } from "lucide-react";
import { applyToPost, cancelApplication, closePost, reopenPost, deletePost } from "../actions";
import { PostForm } from "./PostForm";

export type PostCardData = {
  id: string;
  authorId: string;
  authorName: string;
  type: "SKILL" | "CLASS";
  title: string;
  description: string | null;
  coinReward: number;
  maxApplicants: number | null;
  deadline: Date | null;
  status: "OPEN" | "CLOSED";
  applicationsCount: number; // ACCEPTED+COMPLETED 정원 카운트용
  pendingCount: number; // PENDING (작성자에게 알림용)
  myApplication: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
  } | null;
};

type Props = {
  post: PostCardData;
  isAuthor: boolean;
};

export function PostCard({ post, isAuthor }: Props) {
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <PostForm
        type={post.type}
        mode="EDIT"
        initial={{
          postId: post.id,
          title: post.title,
          description: post.description,
          coinReward: post.coinReward,
          maxApplicants: post.maxApplicants,
          deadline: post.deadline ? post.deadline.toISOString().slice(0, 10) : null,
        }}
        onCancel={() => setEditing(false)}
        onDone={() => setEditing(false)}
      />
    );
  }

  const isClass = post.type === "CLASS";
  const isClosed = post.status === "CLOSED";
  const isFull =
    post.maxApplicants != null && post.applicationsCount >= post.maxApplicants;
  const isExpired = post.deadline ? post.deadline.getTime() < Date.now() : false;
  const canApply = !isAuthor && !isClosed && !isExpired && !post.myApplication && !(isClass && isFull);

  const apply = () => {
    setError(null);
    start(async () => {
      try {
        await applyToPost({ postId: post.id, message: message.trim() || null });
        setMessage("");
        setShowApplyForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      }
    });
  };

  const cancel = () => {
    if (!post.myApplication) return;
    if (!confirm("신청을 취소할까요?")) return;
    start(async () => {
      try {
        await cancelApplication(post.myApplication!.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      }
    });
  };

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(15,20,40,0.5)",
        border: "1px solid var(--line)",
      }}
    >
      <div className="p-4 space-y-2.5">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold" style={{ color: "var(--fg)" }}>
                {post.title}
              </h3>
              {isClosed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                  마감
                </span>
              )}
              {isExpired && !isClosed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">
                  기한 지남
                </span>
              )}
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--fg-muted)" }}>
              by {post.authorName}
            </p>
          </div>
          {post.coinReward > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0"
              style={{
                background: "rgba(177,255,66,0.1)",
                border: "1px solid rgba(177,255,66,0.3)",
              }}
            >
              <Coins size={12} style={{ color: "var(--accent-lime)" }} />
              <span className="text-xs font-bold tabular-nums" style={{ color: "var(--accent-lime)" }}>
                {post.coinReward.toLocaleString("ko-KR")}
              </span>
            </div>
          )}
        </header>

        {post.description && (
          <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--fg-dim)" }}>
            {post.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--fg-muted)" }}>
          {isClass && (
            <span className="inline-flex items-center gap-1">
              <Users size={11} />
              {post.applicationsCount}
              {post.maxApplicants ? `/${post.maxApplicants}` : ""}
            </span>
          )}
          {!isClass && (
            <span className="inline-flex items-center gap-1">
              <Users size={11} />
              신청 {post.applicationsCount + post.pendingCount}
            </span>
          )}
          {post.deadline && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              ~{post.deadline.toISOString().slice(0, 10)}
            </span>
          )}
        </div>

        {/* 본인 신청 상태 */}
        {post.myApplication && (
          <div
            className="rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between"
            style={{
              background: "rgba(0,224,255,0.08)",
              border: "1px solid rgba(0,224,255,0.2)",
              color: "var(--accent-cyan)",
            }}
          >
            <span>
              {post.myApplication.status === "PENDING" && "⏳ 신청 대기 중"}
              {post.myApplication.status === "ACCEPTED" && "✓ 승인됨"}
              {post.myApplication.status === "REJECTED" && "✗ 반려됨"}
              {post.myApplication.status === "COMPLETED" && "🎉 완료 (보상 수령)"}
            </span>
            {post.myApplication.status !== "COMPLETED" && (
              <button onClick={cancel} className="text-[10px] underline" disabled={pending}>
                취소
              </button>
            )}
          </div>
        )}

        {/* 신청 폼 */}
        {showApplyForm && (
          <div className="space-y-2">
            <textarea
              placeholder="신청 메시지 (선택)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                background: "rgba(10,14,31,0.6)",
                border: "1px solid var(--line)",
                color: "var(--fg)",
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={apply}
                disabled={pending}
                className="flex-1 rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #00e0ff, #a155ff)",
                  color: "#0a0e1f",
                }}
              >
                {pending ? "..." : isClass ? "등록" : "신청"}
              </button>
              <button
                onClick={() => setShowApplyForm(false)}
                className="px-4 rounded-lg text-xs"
                style={{ color: "var(--fg-dim)", border: "1px solid var(--line)" }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}

        {/* 액션 버튼 */}
        <div className="flex gap-2 pt-1">
          {canApply && !showApplyForm && (
            <button
              onClick={() => setShowApplyForm(true)}
              className="flex-1 rounded-lg py-2 text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(0,224,255,0.15), rgba(161,85,255,0.15))",
                border: "1px solid rgba(0,224,255,0.3)",
                color: "var(--accent-cyan)",
              }}
            >
              {isClass ? "수업 등록" : "기여 신청"}
            </button>
          )}
          {isClass && isFull && !post.myApplication && !isAuthor && (
            <div className="flex-1 rounded-lg py-2 text-xs text-center" style={{ color: "var(--fg-muted)" }}>
              정원 마감
            </div>
          )}

          <Link
            href={`/team/post/${post.id}`}
            className="rounded-lg px-3 py-2 text-xs"
            style={{
              border: "1px solid var(--line)",
              color: "var(--fg-dim)",
            }}
          >
            {isAuthor ? `관리 (${post.pendingCount + post.applicationsCount})` : "자세히"}
          </Link>
        </div>

        {/* 작성자 컨트롤 */}
        {isAuthor && (
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--line)" }}>
            <AuthorButton onClick={() => setEditing(true)} disabled={pending}>
              <Pencil size={11} className="inline mr-0.5" />
              수정
            </AuthorButton>
            {!isClosed ? (
              <AuthorButton onClick={() => start(() => closePost(post.id))} disabled={pending}>
                마감
              </AuthorButton>
            ) : (
              <AuthorButton onClick={() => start(() => reopenPost(post.id))} disabled={pending}>
                재오픈
              </AuthorButton>
            )}
            <AuthorButton
              onClick={() => {
                if (confirm("정말 삭제할까요?")) start(() => deletePost(post.id));
              }}
              disabled={pending}
              danger
            >
              삭제
            </AuthorButton>
          </div>
        )}
      </div>
    </article>
  );
}

function AuthorButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[11px] px-2 py-1 rounded disabled:opacity-50"
      style={{
        color: danger ? "#fb7185" : "var(--fg-muted)",
        border: "1px solid var(--line)",
      }}
    >
      {children}
    </button>
  );
}
