"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Megaphone, Pin, Pencil, Trash2, X } from "lucide-react";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "./actions";
import { Linkify } from "@/components/Linkify";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
  author: { id: string; name: string };
};

export function AnnouncementPanel({
  announcements,
  myId,
}: {
  announcements: Announcement[];
  myId: string;
}) {
  return (
    <div className="space-y-3">
      <CreateForm />
      {announcements.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center text-xs text-slate-500">
          아직 공지가 없어요.
        </div>
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} a={a} canEdit={a.author.id === myId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(true);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("공지 제목을 입력해주세요");
      return;
    }
    if (startAt && endAt && startAt > endAt) {
      setError("표시 종료일이 시작일보다 빠를 수 없어요");
      return;
    }
    startTransition(async () => {
      try {
        await createAnnouncement({
          title: title.trim(),
          body: body.trim() || null,
          pinned,
          startAt: startAt || null,
          endAt: endAt || null,
        });
        setTitle("");
        setBody("");
        setPinned(true);
        setStartAt("");
        setEndAt("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "공지 작성 실패");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3"
    >
      <div className="flex items-center gap-1.5">
        <Megaphone size={14} className="text-amber-600" />
        <h4 className="text-xs font-semibold text-slate-700">새 공지 작성</h4>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="공지 제목 (예: 이번 주 과제 안내)"
        className="input"
      />
      <textarea
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="상세 내용 (선택)"
        className="input"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-slate-500">표시 시작 (선택)</span>
          <input
            type="date"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">표시 종료 (선택)</span>
          <input
            type="date"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="input mt-1"
          />
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="h-4 w-4 accent-amber-500"
        />
        <Pin size={11} className="text-amber-600" /> 오늘 페이지 상단에 고정
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
      >
        {pending ? "게시 중…" : "📢 공지 게시"}
      </button>
    </form>
  );
}

function AnnouncementCard({ a, canEdit }: { a: Announcement; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function remove() {
    if (!confirm(`"${a.title}" 공지를 삭제할까요?`)) return;
    startTransition(async () => {
      await deleteAnnouncement(a.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li>
        <EditForm
          a={a}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </li>
    );
  }

  return (
    <li className="rounded-2xl bg-white border border-slate-200 p-4">
      <header className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            {a.pinned && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                <Pin size={9} /> 고정
              </span>
            )}
            <span>{a.author.name}</span>
            <span>·</span>
            <span>{format(new Date(a.createdAt), "M/d HH:mm", { locale: ko })}</span>
            {(a.startAt || a.endAt) && (
              <>
                <span>·</span>
                <span>
                  {a.startAt ? format(new Date(a.startAt), "M/d") : "~"}{" "}
                  {a.endAt ? `~ ${format(new Date(a.endAt), "M/d")}` : ""}
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-800">{a.title}</p>
          {a.body && (
            <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
              <Linkify text={a.body} />
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-start gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="p-1 text-slate-400 hover:text-slate-700"
              aria-label="수정"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="p-1 text-slate-400 hover:text-red-600"
              aria-label="삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </header>
    </li>
  );
}

function EditForm({
  a,
  onCancel,
  onDone,
}: {
  a: Announcement;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(a.title);
  const [body, setBody] = useState(a.body ?? "");
  const [pinned, setPinned] = useState(a.pinned);
  const [startAt, setStartAt] = useState(
    a.startAt ? new Date(a.startAt).toISOString().slice(0, 10) : ""
  );
  const [endAt, setEndAt] = useState(
    a.endAt ? new Date(a.endAt).toISOString().slice(0, 10) : ""
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    if (startAt && endAt && startAt > endAt) {
      setError("표시 종료일이 시작일보다 빠를 수 없어요");
      return;
    }
    startTransition(async () => {
      try {
        await updateAnnouncement({
          id: a.id,
          title: title.trim(),
          body: body.trim() || null,
          pinned,
          startAt: startAt || null,
          endAt: endAt || null,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정 실패");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-amber-900">공지 수정</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-amber-600 hover:text-amber-900"
          aria-label="닫기"
        >
          <X size={14} />
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input bg-white"
      />
      <textarea
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="input bg-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-slate-500">표시 시작</span>
          <input
            type="date"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="input mt-1 bg-white"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">표시 종료</span>
          <input
            type="date"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="input mt-1 bg-white"
          />
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="h-4 w-4 accent-amber-500"
        />
        <Pin size={11} className="text-amber-600" /> 고정 표시
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600"
        >
          취소
        </button>
      </div>
    </form>
  );
}
