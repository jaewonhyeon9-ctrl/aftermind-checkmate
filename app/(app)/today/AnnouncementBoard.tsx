import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Megaphone, Pin } from "lucide-react";
import { Linkify } from "@/components/Linkify";

type Item = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  createdAt: Date;
  author: { name: string };
};

export function AnnouncementBoard({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
      <h3 className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
        <Megaphone size={13} /> 공지사항
      </h3>
      <ul className="space-y-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="rounded-xl bg-white/80 backdrop-blur border border-amber-200 p-3"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              {a.pinned && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-semibold">
                  <Pin size={9} /> 고정
                </span>
              )}
              <span>{a.author.name}</span>
              <span>·</span>
              <span>{format(new Date(a.createdAt), "M/d HH:mm", { locale: ko })}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{a.title}</p>
            {a.body && (
              <p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                <Linkify text={a.body} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
