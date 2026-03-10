import { useState, useCallback } from 'react';
import { GameMode } from '../engine';
import { combineStats } from '../stats';
import type { GameStats, LifetimeModeStat, StoredStats } from '../stats';

const STORAGE_KEY = 'stackdown-stats';

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

function loadStats(): StoredStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        marathon: { ...emptyModeStat(), ...parsed.marathon },
        practice: { ...emptyModeStat(), ...parsed.practice },
        versus: { ...emptyModeStat(), ...parsed.versus },
      };
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return {
    marathon: emptyModeStat(),
    practice: emptyModeStat(),
    versus: emptyModeStat(),
  };
}

function saveStats(stats: StoredStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // localStorage not available
  }
}

function mergeGameIntoMode(
  mode: LifetimeModeStat,
  game: GameStats,
  versusResult?: 'win' | 'lose',
): LifetimeModeStat {
  return {
    gamesPlayed: mode.gamesPlayed + 1,
    gamesCompleted: mode.gamesCompleted + (game.completed ? 1 : 0),
    gamesAbandoned: mode.gamesAbandoned + (game.completed ? 0 : 1),
    piecesPlaced: mode.piecesPlaced + game.piecesPlaced,
    holdsUsed: mode.holdsUsed + game.holdsUsed,
    hardDrops: mode.hardDrops + game.hardDrops,
    totalScore: mode.totalScore + game.score,
    highScore: Math.max(mode.highScore, game.score),
    totalLines: mode.totalLines + game.linesCleared,
    totalElapsedMs: mode.totalElapsedMs + game.elapsedMs,
    singles: mode.singles + game.singles,
    doubles: mode.doubles + game.doubles,
    triples: mode.triples + game.triples,
    quads: mode.quads + game.quads,
    tSpinZeros: mode.tSpinZeros + game.tSpinZeros,
    tSpinSingles: mode.tSpinSingles + game.tSpinSingles,
    tSpinDoubles: mode.tSpinDoubles + game.tSpinDoubles,
    tSpinTriples: mode.tSpinTriples + game.tSpinTriples,
    tSpinMiniZeros: mode.tSpinMiniZeros + game.tSpinMiniZeros,
    tSpinMiniSingles: mode.tSpinMiniSingles + game.tSpinMiniSingles,
    tSpinMiniDoubles: mode.tSpinMiniDoubles + game.tSpinMiniDoubles,
    maxCombo: Math.max(mode.maxCombo, game.maxCombo),
    backToBacks: mode.backToBacks + game.backToBacks,
    attackLinesSent: mode.attackLinesSent + game.attackLinesSent,
    garbageReceived: mode.garbageReceived + game.garbageReceived,
    wins: mode.wins + (versusResult === 'win' ? 1 : 0),
    losses: mode.losses + (versusResult === 'lose' ? 1 : 0),
  };
}

export interface PlayerStats {
  stats: StoredStats;
  recordGame: (
    gameStats: GameStats,
    mode: GameMode,
    versusResult?: 'win' | 'lose',
  ) => void;
  getLifetimeStats: (mode?: GameMode) => LifetimeModeStat;
}

export function usePlayerStats(): PlayerStats {
  const [stats, setStats] = useState<StoredStats>(loadStats);

  const recordGame = useCallback(
    (gameStats: GameStats, mode: GameMode, versusResult?: 'win' | 'lose') => {
      setStats((prev) => {
        const key = mode === GameMode.MARATHON
          ? 'marathon'
          : mode === GameMode.VERSUS
            ? 'versus'
            : 'practice';
        const updated: StoredStats = {
          ...prev,
          [key]: mergeGameIntoMode(prev[key], gameStats, versusResult),
        };
        saveStats(updated);
        return updated;
      });
    },
    [],
  );

  const getLifetimeStats = useCallback(
    (mode?: GameMode): LifetimeModeStat => {
      if (!mode) {
        return combineStats(stats.marathon, stats.practice, stats.versus);
      }
      const key = mode === GameMode.MARATHON
        ? 'marathon'
        : mode === GameMode.VERSUS
          ? 'versus'
          : 'practice';
      return stats[key];
    },
    [stats],
  );

  return { stats, recordGame, getLifetimeStats };
}
