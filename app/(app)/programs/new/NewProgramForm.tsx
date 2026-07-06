"use client";

import { useState, useTransition } from "react";
import { createProgram } from "./actions";

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export function NewProgramForm() {
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("팀 이름을 입력해주세요");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("URL 코드는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요");
      return;
    }
    startTransition(async () => {
      const result = await createProgram({ name: name.trim(), slug }).catch(() => ({
        ok: false as const,
        error: "문제가 발생했어요. 잠시 후 다시 시도해주세요",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // 클라이언트 라우터 전환 대신 하드 네비게이션 — /today 렌더가 느려도
      // 이 버튼이 "만드는 중..."에 멈춰있는 것처럼 보이지 않는다.
      setCreated(true);
      window.location.assign("/today");
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <label className="block">
        <span className="text-xs text-slate-500">팀 이름</span>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="예: 1인기업가 3기"
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">가입 링크에 쓸 URL 코드 (영문 소문자·숫자·하이픈)</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
          placeholder="예: solo-founder-3"
          className="input mt-1"
        />
        {slug && <p className="mt-1 text-[11px] text-slate-400">가입 링크: /join/{slug}</p>}
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || created}
        className="w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 disabled:opacity-50"
      >
        {created ? "완료! 이동 중…" : pending ? "만드는 중…" : "팀 만들기"}
      </button>
    </form>
  );
}
