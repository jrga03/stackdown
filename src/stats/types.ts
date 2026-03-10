/** Per-game stats snapshot, accumulated from engine events. */
export interface GameStats {
  // General
  piecesPlaced: number;
  holdsUsed: number;
  hardDrops: number;
  score: number;
  level: number;
  linesCleared: number;
  elapsedMs: number;
  completed: boolean;

  // Line clears (non-T-Spin)
  singles: number;
  doubles: number;
  triples: number;
  quads: number;

  // T-Spins (proper)
  tSpinZeros: number;
  tSpinSingles: number;
  tSpinDoubles: number;
  tSpinTriples: number;

  // T-Spin Minis
  tSpinMiniZeros: number;
  tSpinMiniSingles: number;
  tSpinMiniDoubles: number;

  // Combo & B2B
  maxCombo: number;
  backToBacks: number;

  // Versus-only (0 for non-versus games)
  attackLinesSent: number;
  garbageReceived: number;
}

/** Lifetime stats for a single mode. */
export interface LifetimeModeStat {
  gamesPlayed: number;
  gamesCompleted: number;
  gamesAbandoned: number;
  piecesPlaced: number;
  holdsUsed: number;
  hardDrops: number;
  totalScore: number;
  highScore: number;
  totalLines: number;
  totalElapsedMs: number;
  singles: number;
  doubles: number;
  triples: number;
  quads: number;
  tSpinZeros: number;
  tSpinSingles: number;
  tSpinDoubles: number;
  tSpinTriples: number;
  tSpinMiniZeros: number;
  tSpinMiniSingles: number;
  tSpinMiniDoubles: number;
  maxCombo: number;
  backToBacks: number;
  attackLinesSent: number;
  garbageReceived: number;
  wins: number;
  losses: number;
}

/** Stored shape — per-mode only, "all" is computed by summing at read time. */
export interface StoredStats {
  marathon: LifetimeModeStat;
  practice: LifetimeModeStat;
  versus: LifetimeModeStat;
}
