"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Link as LinkIcon } from "lucide-react";

export function JoinLinkCard({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const link = origin ? `${origin}/join/${slug}` : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
      <p className="text-xs text-slate-500 inline-flex items-center gap-1">
        <LinkIcon size={12} /> 이 링크를 팀원에게 공유하세요. 가입 신청 후 위에서 승인하면 돼요.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
          {link || "..."}
        </code>
        <button
          type="button"
          onClick={copy}
          disabled={!link}
          className="flex-shrink-0 rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}