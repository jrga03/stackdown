import { useState } from 'react';
import { GameMode } from '../engine';

const PERSONAL_BESTS_KEY = 'stackdown-personal-bests';

interface PersonalBests {
  marathon: number;
  practice: number;
}

const DEFAULT_PERSONAL_BESTS: PersonalBests = { marathon: 0, practice: 0 };

function loadBests(): PersonalBests {
  try {
    const saved = localStorage.getItem(PERSONAL_BESTS_KEY);
    if (!saved) return DEFAULT_PERSONAL_BESTS;
    const parsed = JSON.parse(saved) as Partial<PersonalBests>;
    return {
      marathon: typeof parsed.marathon === 'number' ? parsed.marathon : 0,
      practice: typeof parsed.practice === 'number' ? parsed.practice : 0,
    };
  } catch {
    return DEFAULT_PERSONAL_BESTS;
  }
}

export function usePersonalBests() {
  const [bests, setBests] = useState<PersonalBests>(loadBests);

  const checkAndUpdate = (mode: GameMode, score: number): boolean => {
    const key = mode === GameMode.MARATHON ? 'marathon' : 'practice';
    if (score > bests[key]) {
      const next = { ...bests, [key]: score };
      setBests(next);
      localStorage.setItem(PERSONAL_BESTS_KEY, JSON.stringify(next));
      return true;
    }
    return false;
  };

  return { bests, checkAndUpdate };
}
