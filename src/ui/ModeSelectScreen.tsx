import { useState, useMemo } from 'react';
import { GameMode, type GameConfig } from '../engine';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import './MainMenu.css';

interface ModeSelectProps {
  onStart: (config: GameConfig) => void;
  onVersus: () => void;
  onBack: () => void;
}

const MODES = [GameMode.MARATHON, GameMode.PRACTICE];
const MODE_LABELS = ['MARATHON', 'PRACTICE'];

export function ModeSelectScreen({ onStart, onVersus, onBack }: ModeSelectProps) {
  const [mode, setMode] = useState<GameMode>(GameMode.MARATHON);
  const [startLevel, setStartLevel] = useState(1);

  const modeIndex = MODES.indexOf(mode);

  const items: MenuItemType[] = useMemo(() => {
    const list: MenuItemType[] = [
      {
        kind: 'toggle',
        options: MODE_LABELS,
        selectedIndex: MODES.indexOf(mode),
        onChange: (i) => setMode(MODES[i] ?? GameMode.MARATHON),
      },
    ];
    if (mode === GameMode.PRACTICE) {
      list.push({
        kind: 'slider',
        value: startLevel,
        min: 1,
        max: 15,
        step: 1,
        onChange: setStartLevel,
      });
    }
    list.push(
      {
        kind: 'button',
        onActivate: () =>
          onStart({
            mode,
            startLevel: mode === GameMode.PRACTICE ? startLevel : 1,
          }),
      },
      { kind: 'button', onActivate: onVersus },
      { kind: 'button', onActivate: onBack },
    );
    return list;
  }, [mode, startLevel, onStart, onVersus, onBack]);

  const { getItemProps } = useMenuNavigation({ items, onEscape: onBack });

  // Compute item indices for the buttons after the conditional slider
  const sliderIndex = mode === GameMode.PRACTICE ? 1 : -1;
  const startIndex = mode === GameMode.PRACTICE ? 2 : 1;
  const versusIndex = mode === GameMode.PRACTICE ? 3 : 2;
  const backIndex = mode === GameMode.PRACTICE ? 4 : 3;

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>
        SELECT MODE
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
          className={`menu-row ${getItemProps(sliderIndex).className}`}
          onMouseEnter={getItemProps(sliderIndex).onMouseEnter}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '4px',
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
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            ← → to adjust
          </div>
        </div>
      )}
      <div className="menu-buttons">
        <button
          className={`menu-button ${getItemProps(startIndex).className}`}
          onMouseEnter={getItemProps(startIndex).onMouseEnter}
          onClick={getItemProps(startIndex).onClick}
        >
          START
        </button>
        <button
          className={`menu-button ${getItemProps(versusIndex).className}`}
          onMouseEnter={getItemProps(versusIndex).onMouseEnter}
          onClick={getItemProps(versusIndex).onClick}
        >
          VERSUS AI
        </button>
        <button
          className={`menu-button ${getItemProps(backIndex).className}`}
          onMouseEnter={getItemProps(backIndex).onMouseEnter}
          onClick={getItemProps(backIndex).onClick}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
