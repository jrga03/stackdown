import { useState } from 'react';
import { GameMode } from '../engine';

export interface ScoreEntry {
  score: number;
  level: number;
  lines: number;
  date: string; // ISO date "2026-03-04" or "" for migrated entries
}

interface Scoreboard {
  marathon: ScoreEntry[];
  practice: ScoreEntry[];
}

const SCOREBOARD_KEY = 'stackdown-scoreboard';
const LEGACY_KEY = 'stackdown-personal-bests';
const MAX_ENTRIES = 5;

function loadScoreboard(): Scoreboard {
  try {
    const saved = localStorage.getItem(SCOREBOARD_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Scoreboard>;
      return {
        marathon: Array.isArray(parsed.marathon) ? parsed.marathon : [],
        practice: Array.isArray(parsed.practice) ? parsed.practice : [],
      };
    }

    // Migrate from legacy personal bests
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<{ marathon: number; practice: number }>;
      const board: Scoreboard = { marathon: [], practice: [] };
      if (typeof parsed.marathon === 'number' && parsed.marathon > 0) {
        board.marathon.push({ score: parsed.marathon, level: 0, lines: 0, date: '' });
      }
      if (typeof parsed.practice === 'number' && parsed.practice > 0) {
        board.practice.push({ score: parsed.practice, level: 0, lines: 0, date: '' });
      }
      localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(board));
      localStorage.removeItem(LEGACY_KEY);
      return board;
    }
  } catch {
    // fall through
  }
  return { marathon: [], practice: [] };
}

function insertSorted(entries: ScoreEntry[], entry: ScoreEntry): { list: ScoreEntry[]; rank: number | null } {
  const list = [...entries];
  let rank = list.findIndex((e) => entry.score > e.score);
  if (rank === -1) {
    if (list.length < MAX_ENTRIES) {
      rank = list.length;
      list.push(entry);
    } else {
      return { list, rank: null };
    }
  } else {
    list.splice(rank, 0, entry);
  }
  return { list: list.slice(0, MAX_ENTRIES), rank };
}

export function useScoreboard() {
  const [scoreboard, setScoreboard] = useState<Scoreboard>(loadScoreboard);

  const addScore = (
    mode: GameMode,
    entry: { score: number; level: number; lines: number },
  ): { rank: number | null } => {
    const key = mode === GameMode.MARATHON ? 'marathon' : 'practice';
    const full: ScoreEntry = {
      ...entry,
      date: new Date().toISOString().slice(0, 10),
    };
    const { list, rank } = insertSorted(scoreboard[key], full);
    const next = { ...scoreboard, [key]: list };
    setScoreboard(next);
    localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(next));
    return { rank };
  };

  return { scoreboard, addScore };
}
