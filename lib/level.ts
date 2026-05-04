/**
 * 루틴 레벨 시스템.
 *
 * XP 계산 (DB 자료 기반, 별도 저장 없이 derived):
 *  - 데일리 엔트리 작성: +10
 *  - 타임라인 온타임 완료: +15 (full)
 *  - 타임라인 지각 완료: +7 (절반)
 *  - Must 3 체크 완료: +5
 *  - 운영자 과제 완료: +15
 *  - 연속 작성(streak) 보너스: streak * 2 (단, 최대 100까지)
 */

export type LevelInfo = {
  level: number;
  name: string;
  emoji: string;
  threshold: number; // 이 레벨 시작 XP
  description: string;
};

export const LEVELS: LevelInfo[] = [
  { level: 1, name: "불규칙 루티너", emoji: "🌫️", threshold: 0, description: "이제 막 시작! 일단 한 번 써보세요" },
  { level: 2, name: "흔들리는 루티너", emoji: "🌬️", threshold: 50, description: "흐트러져도 괜찮아요. 다시 잡으면 돼요" },
  { level: 3, name: "새싹 루티너", emoji: "🌱", threshold: 150, description: "꾸준함의 새싹이 돋아나는 중" },
  { level: 4, name: "꾸준 루티너", emoji: "🌿", threshold: 350, description: "리듬을 찾기 시작했어요" },
  { level: 5, name: "균형 루티너", emoji: "⚖️", threshold: 700, description: "Must와 Nice의 균형이 잡혔어요" },
  { level: 6, name: "단단한 루티너", emoji: "🪵", threshold: 1200, description: "흔들리지 않는 루틴" },
  { level: 7, name: "마스터 루티너", emoji: "🏗️", threshold: 2000, description: "다른 사람의 루틴까지 코칭할 레벨" },
  { level: 8, name: "루틴 마에스트로", emoji: "🎼", threshold: 3500, description: "하루를 작품처럼 짜는 사람" },
  { level: 9, name: "그랜드 루티너", emoji: "👑", threshold: 6000, description: "당신의 루틴이 곧 예술" },
  { level: 10, name: "전설의 루티너", emoji: "🌟", threshold: 10000, description: "전설로 기록될 루티너" },
];

export type RoutineSourceCounts = {
  entries: number;
  timelineOnTime: number;
  timelineLate: number;
  mustChecksDone: number;
  assignmentsDone: number;
  streak: number;
};

export function computeXp(c: RoutineSourceCounts): number {
  const streakBonus = Math.min(c.streak * 2, 100);
  return (
    c.entries * 10 +
    c.timelineOnTime * 15 +
    c.timelineLate * 7 + // 지각은 절반 가중치
    c.mustChecksDone * 5 +
    c.assignmentsDone * 15 +
    streakBonus
  );
}

export function levelFromXp(xp: number): {
  current: LevelInfo;
  next: LevelInfo | null;
  progressPct: number;
  xpInLevel: number;
  xpToNext: number;
} {
  let current = LEVELS[0];
  let next: LevelInfo | null = LEVELS[1] ?? null;

  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].threshold) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    } else {
      break;
    }
  }

  const xpInLevel = xp - current.threshold;
  const xpToNext = next ? next.threshold - current.threshold : 0;
  const progressPct = next ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100;

  return { current, next, progressPct, xpInLevel, xpToNext };
}
