import { useState, useCallback } from 'react';

const STORAGE_KEY = 'versus-level';
const MIN_LEVEL = 1;
const MAX_LEVEL = 100;

export type RankLabel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master';

export function getRankLabel(level: number): RankLabel {
  if (level <= 20) return 'Beginner';
  if (level <= 40) return 'Intermediate';
  if (level <= 60) return 'Advanced';
  if (level <= 80) return 'Expert';
  return 'Master';
}

function loadLevel(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n >= MIN_LEVEL && n <= MAX_LEVEL) return n;
    }
  } catch {
    // localStorage not available
  }
  return MIN_LEVEL;
}

function saveLevel(level: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    // localStorage not available
  }
}

export function useVersusLevel() {
  const [level, setLevel] = useState(loadLevel);

  const recordWin = useCallback(() => {
    setLevel((prev) => {
      const next = Math.min(prev + 1, MAX_LEVEL);
      saveLevel(next);
      return next;
    });
  }, []);

  const recordLoss = useCallback(() => {
    setLevel((prev) => {
      const next = Math.max(prev - 1, MIN_LEVEL);
      saveLevel(next);
      return next;
    });
  }, []);

  return {
    level,
    rankLabel: getRankLabel(level),
    recordWin,
    recordLoss,
  };
}
