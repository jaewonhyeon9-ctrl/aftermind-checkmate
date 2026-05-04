/**
 * 시간대(타임존) 인지 날짜 헬퍼.
 * 사용자별 timezone(예: "Asia/Seoul", "America/New_York")에 맞춰 "오늘"을 계산.
 */

/** 주어진 IANA timezone 기준 "오늘" 날짜 문자열 (YYYY-MM-DD) */
export function todayInTz(tz: string = "Asia/Seoul"): string {
  return formatDateInTz(new Date(), tz);
}

export function yesterdayInTz(tz: string = "Asia/Seoul"): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return formatDateInTz(d, tz);
}

export function tomorrowInTz(tz: string = "Asia/Seoul"): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return formatDateInTz(d, tz);
}

export function daysAgoInTz(n: number, tz: string = "Asia/Seoul"): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return formatDateInTz(d, tz);
}

export function thisWeekStartInTz(tz: string = "Asia/Seoul"): string {
  const today = todayInTz(tz);
  const dow = new Date(today + "T00:00:00.000Z").getUTCDay(); // 0=일
  const offset = (dow + 6) % 7; // 월요일 기준
  return daysAgoInTz(offset, tz);
}

export function thisMonthStartInTz(tz: string = "Asia/Seoul"): string {
  const today = todayInTz(tz);
  return today.slice(0, 7) + "-01";
}

/** Date → "YYYY-MM-DD" in given timezone */
function formatDateInTz(d: Date, tz: string): string {
  // en-CA 로케일은 ISO-style YYYY-MM-DD를 반환
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

/** 문자열 YYYY-MM-DD → UTC 기준 Date(자정) — Prisma date 컬럼 매핑용 */
export function dateOnly(s: string): Date {
  return new Date(s + "T00:00:00.000Z");
}

// === 하위 호환 (Asia/Seoul 고정) ===
export function todayKst(): string { return todayInTz("Asia/Seoul"); }
export function yesterdayKst(): string { return yesterdayInTz("Asia/Seoul"); }
export function daysAgoKst(n: number): string { return daysAgoInTz(n, "Asia/Seoul"); }
export function thisWeekStartKst(): string { return thisWeekStartInTz("Asia/Seoul"); }
export function thisMonthStartKst(): string { return thisMonthStartInTz("Asia/Seoul"); }

/** ISO 주차 키 — "YYYY-Www" (예: 2026-W18) — 사용자 timezone 기준 */
export function currentWeekKey(tz: string = "Asia/Seoul"): string {
  const todayStr = todayInTz(tz);
  const d = new Date(todayStr + "T00:00:00.000Z");
  // ISO 8601 주차 계산 (월요일 시작)
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 60 * 60 * 1000));
  const year = new Date(firstThursday).getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** 월 키 — "YYYY-MM" */
export function currentMonthKey(tz: string = "Asia/Seoul"): string {
  return todayInTz(tz).slice(0, 7);
}

/** 연 키 — "YYYY" */
export function currentYearKey(tz: string = "Asia/Seoul"): string {
  return todayInTz(tz).slice(0, 4);
}

/** 흔히 쓰는 IANA 타임존 옵션 (UI 드롭다운용) */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Asia/Seoul", label: "🇰🇷 한국 (KST, UTC+9)" },
  { value: "Asia/Tokyo", label: "🇯🇵 일본 (JST, UTC+9)" },
  { value: "Asia/Shanghai", label: "🇨🇳 중국 (CST, UTC+8)" },
  { value: "Asia/Singapore", label: "🇸🇬 싱가포르 (UTC+8)" },
  { value: "Asia/Bangkok", label: "🇹🇭 태국 (ICT, UTC+7)" },
  { value: "Asia/Kolkata", label: "🇮🇳 인도 (IST, UTC+5:30)" },
  { value: "Asia/Dubai", label: "🇦🇪 두바이 (GST, UTC+4)" },
  { value: "Europe/London", label: "🇬🇧 영국 (GMT/BST)" },
  { value: "Europe/Berlin", label: "🇪🇺 유럽 (CET/CEST)" },
  { value: "Africa/Johannesburg", label: "🇿🇦 남아공 (SAST, UTC+2)" },
  { value: "America/New_York", label: "🇺🇸 미국 동부 (ET)" },
  { value: "America/Chicago", label: "🇺🇸 미국 중부 (CT)" },
  { value: "America/Denver", label: "🇺🇸 미국 산악 (MT)" },
  { value: "America/Los_Angeles", label: "🇺🇸 미국 서부 (PT)" },
  { value: "America/Sao_Paulo", label: "🇧🇷 브라질 (BRT)" },
  { value: "Australia/Sydney", label: "🇦🇺 호주 시드니 (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "🇳🇿 뉴질랜드 (NZST/NZDT)" },
];
