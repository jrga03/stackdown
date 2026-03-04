import { useState } from 'react';
import { type KeyBindings, DEFAULT_KEY_BINDINGS } from '../input';

export interface Settings {
  keyBindings: KeyBindings;
  dasDelay: number;   // 50-300ms, default 167
  arrInterval: number; // 0-100ms, default 33
  softDropArr: number; // 0-100ms, default 33
}

const SETTINGS_KEY = 'stackdown-settings';

const DEFAULT_SETTINGS: Settings = {
  keyBindings: DEFAULT_KEY_BINDINGS,
  dasDelay: 167,
  arrInterval: 33,
  softDropArr: 33,
};

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetToDefaults = () => {
    localStorage.removeItem(SETTINGS_KEY);
    setSettings(DEFAULT_SETTINGS);
  };

  return { settings, updateSettings, resetToDefaults };
}
