// ── Board Dimensions ──

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 40; // total rows (top 20 are buffer)
export const VISIBLE_HEIGHT = 20;
export const SPAWN_ROW = 18; // rows 18-19 are just above visible area
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const TICK_MS = 16.667; // ~60 ticks/second
export const PRACTICE_DURATION_MS = 120_000; // 2 minutes

// ── Gravity Timing Table (ms per cell) ──

export const GRAVITY_TABLE: readonly number[] = [
  0, // index 0 unused (levels are 1-indexed)
  1000, // level 1
  793, // level 2
  618, // level 3
  473, // level 4
  355, // level 5
  262, // level 6
  190, // level 7
  135, // level 8
  94, // level 9
  64, // level 10
  43, // level 11
  28, // level 12
  18, // level 13
  11, // level 14
  7, // level 15
];

// ── Lines Per Level ──

export const LINES_PER_LEVEL: readonly number[] = [
  0, // index 0 unused
  5, 5, 5, 5, 5, // levels 1-5
  10, 10, 10, 10, 10, // levels 6-10
  15, 15, 15, 15, 15, // levels 11-15
];

// ── Scoring Base Points ──

export const SCORE_TABLE = {
  single: 100,
  double: 300,
  triple: 500,
  quad: 800,
  tSpin: 400,
  tSpinSingle: 800,
  tSpinDouble: 1200,
  tSpinTriple: 1600,
  tSpinMini: 100,
  tSpinMiniSingle: 200,
  tSpinMiniDouble: 400,
  softDrop: 1, // per cell, not multiplied by level
  hardDrop: 2, // per cell, not multiplied by level
  comboMultiplier: 50, // 50 × combo × level
  backToBackMultiplier: 1.5,
} as const;

// ── Attack Table (lines sent to opponent) ──

export const ATTACK_TABLE: Record<number, number> = {
  0: 0,
  1: 0, // single
  2: 1, // double
  3: 2, // triple
  4: 4, // quad
};

export const TSPIN_ATTACK_TABLE: Record<number, number> = {
  0: 0,
  1: 2, // T-Spin single
  2: 4, // T-Spin double
  3: 6, // T-Spin triple
};

export const TSPIN_MINI_ATTACK_TABLE: Record<number, number> = {
  0: 0,
  1: 0, // T-Spin mini single
  2: 1, // T-Spin mini double
};

export const BACK_TO_BACK_ATTACK_BONUS = 1;

export const COMBO_ATTACK_TABLE: readonly number[] = [
  0, // combo 0
  0, // combo 1
  1, // combo 2
  1, // combo 3
  2, // combo 4
  2, // combo 5
  3, // combo 6
  3, // combo 7
  4, // combo 8+
];
