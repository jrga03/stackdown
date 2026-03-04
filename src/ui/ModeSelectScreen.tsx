import { useState } from 'react';
import { GameMode, type GameConfig } from '../engine';
import './MainMenu.css';

interface ModeSelectProps {
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

export function ModeSelectScreen({ onStart, onBack }: ModeSelectProps) {
  const [mode, setMode] = useState<GameMode>(GameMode.MARATHON);
  const [startLevel, setStartLevel] = useState(1);

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>
        SELECT MODE
      </h2>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          className="menu-button"
          style={{
            background:
              mode === GameMode.MARATHON
                ? 'rgba(255,255,255,0.25)'
                : undefined,
          }}
          onClick={() => setMode(GameMode.MARATHON)}
        >
          MARATHON
        </button>
        <button
          className="menu-button"
          style={{
            background:
              mode === GameMode.PRACTICE
                ? 'rgba(255,255,255,0.25)'
                : undefined,
          }}
          onClick={() => setMode(GameMode.PRACTICE)}
        >
          PRACTICE
        </button>
      </div>
      <div
        style={{
          color: 'rgba(255,255,255,0.6)',
          maxWidth: 300,
          textAlign: 'center',
        }}
      >
        {mode === GameMode.MARATHON
          ? 'Clear lines to advance through 15 levels. Game ends on top-out.'
          : 'Fixed gravity level. Score as high as you can in 2 minutes.'}
      </div>
      {mode === GameMode.PRACTICE && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <label>Level: {startLevel}</label>
          <input
            type="range"
            min={1}
            max={15}
            value={startLevel}
            onChange={(e) => setStartLevel(Number(e.target.value))}
          />
        </div>
      )}
      <div className="menu-buttons">
        <button
          className="menu-button"
          onClick={() =>
            onStart({
              mode,
              startLevel: mode === GameMode.PRACTICE ? startLevel : 1,
            })
          }
        >
          START
        </button>
        <button className="menu-button" onClick={onBack}>
          BACK
        </button>
      </div>
    </div>
  );
}
