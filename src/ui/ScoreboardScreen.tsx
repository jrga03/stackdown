import { useState, useMemo } from 'react';
import { GameMode } from '../engine';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import { useScoreboard } from '../hooks/useScoreboard';
import './MainMenu.css';

interface ScoreboardScreenProps {
  onBack: () => void;
}

const MODES = [GameMode.MARATHON, GameMode.PRACTICE];
const MODE_LABELS = ['MARATHON', 'PRACTICE'];

export function ScoreboardScreen({ onBack }: ScoreboardScreenProps) {
  const { scoreboard } = useScoreboard();
  const [mode, setMode] = useState<GameMode>(GameMode.MARATHON);

  const modeIndex = MODES.indexOf(mode);

  const items: MenuItemType[] = useMemo(
    () => [
      {
        kind: 'toggle',
        options: MODE_LABELS,
        selectedIndex: MODES.indexOf(mode),
        onChange: (i: number) => setMode(MODES[i] ?? GameMode.MARATHON),
      },
      { kind: 'button', onActivate: onBack },
    ],
    [mode, onBack],
  );

  const { getItemProps } = useMenuNavigation({ items, onEscape: onBack });

  const key = mode === GameMode.MARATHON ? 'marathon' : 'practice';
  const entries = scoreboard[key];

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>
        SCORES
      </h2>
      <div
        className={`menu-row ${getItemProps(0).className}`}
        onMouseEnter={getItemProps(0).onMouseEnter}
        style={{ display: 'flex', gap: '12px', padding: '4px' }}
      >
        {MODE_LABELS.map((label, i) => (
          <button
            key={label}
            className="menu-button"
            style={{
              background:
                modeIndex === i ? 'rgba(255,255,255,0.25)' : undefined,
            }}
            onClick={() => setMode(MODES[i] ?? GameMode.MARATHON)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
        ← → to switch mode
      </div>
      <div className="scoreboard-list" style={{ marginTop: 8 }}>
        {Array.from({ length: 5 }, (_, i) => {
          const entry = entries[i];
          return (
            <div key={i} className="scoreboard-row">
              <span style={{ width: 20 }}>{i + 1}.</span>
              {entry ? (
                <>
                  <span style={{ width: 80, textAlign: 'right' }}>{entry.score.toLocaleString()}</span>
                  <span style={{ width: 40, textAlign: 'right' }}>L{entry.level}</span>
                  <span style={{ width: 50, textAlign: 'right' }}>{entry.lines}ln</span>
                  <span style={{ width: 80, textAlign: 'right' }}>{entry.date || '\u2014'}</span>
                </>
              ) : (
                <span>{'\u2014'}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="menu-buttons">
        <button
          className={`menu-button ${getItemProps(1).className}`}
          onMouseEnter={getItemProps(1).onMouseEnter}
          onClick={getItemProps(1).onClick}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
