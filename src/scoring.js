// Design Ref: §3.4 — level speeds and scoring formula
// Plan SC: FR-11 (score), FR-12 (level)

// Gravity interval per level (ms) — Tetris guideline approximation
export const LEVEL_SPEEDS = [
  1000, 793, 618, 473, 355,
   262, 190, 135,  94,  64,
    43,  28,  18,  11,   7,
];

export function getSpeed(level) {
  return LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)];
}

// Points per lines cleared × level multiplier
// Plan SC: FR-11 — 1줄=100, 2줄=300, 3줄=500, 4줄=800
const LINE_POINTS = [0, 100, 300, 500, 800];

export function calcScore(linesCleared, level) {
  return (LINE_POINTS[linesCleared] ?? 0) * level;
}

// Level up every 10 lines, max level 15
// Plan SC: FR-12
export function calcLevel(totalLines) {
  return Math.min(Math.floor(totalLines / 10) + 1, 15);
}
