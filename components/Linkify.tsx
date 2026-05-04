import { Fragment } from "react";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

/**
 * 텍스트 내 URL을 자동으로 링크로 변환.
 * 줄바꿈도 보존.
 */
export function Linkify({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (URL_RE.test(part)) {
          // /g flag stateful — reset
          URL_RE.lastIndex = 0;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {hostnameOf(part)}
            </a>
          );
        }
        return (
          <Fragment key={i}>
            {part.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </span>
  );
}

function hostnameOf(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname;
    if (path.length > 20) path = path.slice(0, 20) + "…";
    return `${u.hostname}${path === "/" ? "" : path}`;
  } catch {
    return url;
  }
}
