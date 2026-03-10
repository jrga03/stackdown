import { useState, useCallback } from 'react';

const STORAGE_KEY = 'stackdown-player-xp';
const MAX_LEVEL = 100;

export type RankLabel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master';

/** XP required to go from `level` to `level+1`. */
export function xpForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(level, 1.2));
}

/** Total cumulative XP required to reach `level` (from level 1). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/** Derive player level (1–100) from total accumulated XP. */
export function levelFromTotalXP(totalXP: number): number {
  let level = 1;
  let remaining = totalXP;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level++;
  }
  return level;
}

export function getRankLabel(level: number): RankLabel {
  if (level <= 20) return 'Beginner';
  if (level <= 40) return 'Intermediate';
  if (level <= 60) return 'Advanced';
  if (level <= 80) return 'Expert';
  return 'Master';
}

export interface XPGainResult {
  xpGained: number;
  previousLevel: number;
  newLevel: number;
  previousXPInLevel: number;
  newXPInLevel: number;
  xpRequiredForLevel: number;
  didLevelUp: boolean;
  levelsGained: number;
}

interface XPState {
  totalXP: number;
}

function loadXPState(): XPState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.totalXP === 'number' && parsed.totalXP >= 0) {
        return { totalXP: parsed.totalXP };
      }
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return { totalXP: 0 };
}

function saveXPState(state: XPState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}

export interface PlayerXP {
  level: number;
  totalXP: number;
  xpInCurrentLevel: number;
  xpRequiredForCurrentLevel: number;
  rankLabel: RankLabel;
  addXP: (xp: number) => XPGainResult;
}

export function usePlayerXP(): PlayerXP {
  const [xpState, setXPState] = useState<XPState>(loadXPState);

  const level = levelFromTotalXP(xpState.totalXP);
  const cumXPForCurrentLevel = totalXpForLevel(level);
  const xpInCurrentLevel = xpState.totalXP - cumXPForCurrentLevel;
  const xpRequiredForCurrentLevel = level >= MAX_LEVEL ? 0 : xpForLevel(level);

  const addXP = useCallback((xp: number): XPGainResult => {
    let result!: XPGainResult;
    setXPState((prev) => {
      const previousLevel = levelFromTotalXP(prev.totalXP);
      const previousCum = totalXpForLevel(previousLevel);
      const previousXPInLevel = prev.totalXP - previousCum;

      const newTotalXP = prev.totalXP + xp;
      const newLevel = levelFromTotalXP(newTotalXP);
      const newCum = totalXpForLevel(newLevel);
      const newXPInLevel = newTotalXP - newCum;
      const xpRequired = newLevel >= MAX_LEVEL ? 0 : xpForLevel(newLevel);

      result = {
        xpGained: xp,
        previousLevel,
        newLevel,
        previousXPInLevel,
        newXPInLevel,
        xpRequiredForLevel: xpRequired,
        didLevelUp: newLevel > previousLevel,
        levelsGained: newLevel - previousLevel,
      };

      const newState = { totalXP: newTotalXP };
      saveXPState(newState);
      return newState;
    });
    return result;
  }, []);

  return {
    level,
    totalXP: xpState.totalXP,
    xpInCurrentLevel,
    xpRequiredForCurrentLevel,
    rankLabel: getRankLabel(level),
    addXP,
  };
}
