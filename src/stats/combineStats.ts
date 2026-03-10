import type { LifetimeModeStat } from './types';

function emptyModeStat(): LifetimeModeStat {
  return {
    gamesPlayed: 0,
    gamesCompleted: 0,
    gamesAbandoned: 0,
    piecesPlaced: 0,
    holdsUsed: 0,
    hardDrops: 0,
    totalScore: 0,
    highScore: 0,
    totalLines: 0,
    totalElapsedMs: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    quads: 0,
    tSpinZeros: 0,
    tSpinSingles: 0,
    tSpinDoubles: 0,
    tSpinTriples: 0,
    tSpinMiniZeros: 0,
    tSpinMiniSingles: 0,
    tSpinMiniDoubles: 0,
    maxCombo: 0,
    backToBacks: 0,
    attackLinesSent: 0,
    garbageReceived: 0,
    wins: 0,
    losses: 0,
  };
}

/** Combine multiple mode stats into a single aggregate. */
export function combineStats(...modes: LifetimeModeStat[]): LifetimeModeStat {
  const result = emptyModeStat();
  for (const m of modes) {
    result.gamesPlayed += m.gamesPlayed;
    result.gamesCompleted += m.gamesCompleted;
    result.gamesAbandoned += m.gamesAbandoned;
    result.piecesPlaced += m.piecesPlaced;
    result.holdsUsed += m.holdsUsed;
    result.hardDrops += m.hardDrops;
    result.totalScore += m.totalScore;
    result.highScore = Math.max(result.highScore, m.highScore);
    result.totalLines += m.totalLines;
    result.totalElapsedMs += m.totalElapsedMs;
    result.singles += m.singles;
    result.doubles += m.doubles;
    result.triples += m.triples;
    result.quads += m.quads;
    result.tSpinZeros += m.tSpinZeros;
    result.tSpinSingles += m.tSpinSingles;
    result.tSpinDoubles += m.tSpinDoubles;
    result.tSpinTriples += m.tSpinTriples;
    result.tSpinMiniZeros += m.tSpinMiniZeros;
    result.tSpinMiniSingles += m.tSpinMiniSingles;
    result.tSpinMiniDoubles += m.tSpinMiniDoubles;
    result.maxCombo = Math.max(result.maxCombo, m.maxCombo);
    result.backToBacks += m.backToBacks;
    result.attackLinesSent += m.attackLinesSent;
    result.garbageReceived += m.garbageReceived;
    result.wins += m.wins;
    result.losses += m.losses;
  }
  return result;
}
