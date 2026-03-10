import { useState, useMemo } from 'react';
import { GameMode, type GameConfig } from '../engine';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import './MainMenu.css';

interface GameConfigScreenProps {
  mode: GameMode;
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

const MODE_DESCRIPTIONS: Record<string, string> = {
  [GameMode.MARATHON]: 'Clear lines to advance through 15 levels. Game ends on top-out.',
  [GameMode.PRACTICE]: 'Fixed gravity level. Score as high as you can in 2 minutes.',
};

export function GameConfigScreen({ mode, onStart, onBack }: GameConfigScreenProps) {
  const [startLevel, setStartLevel] = useState(1);

  const items: MenuItemType[] = useMemo(() => {
    const list: MenuItemType[] = [];
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
        onActivate: () => onStart({
          mode,
          startLevel: mode === GameMode.PRACTICE ? startLevel : 1,
        }),
      },
      { kind: 'button', onActivate: onBack },
    );
    return list;
  }, [mode, startLevel, onStart, onBack]);

  const { getItemProps } = useMenuNavigation({ items, onEscape: onBack });

  const sliderIndex = mode === GameMode.PRACTICE ? 0 : -1;
  const startIndex = mode === GameMode.PRACTICE ? 1 : 0;
  const backIndex = mode === GameMode.PRACTICE ? 2 : 1;

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>
        {mode === GameMode.MARATHON ? 'MARATHON' : 'PRACTICE'}
      </h2>
      <div
        style={{
          color: 'rgba(255,255,255,0.6)',
          maxWidth: 300,
          textAlign: 'center',
        }}
      >
        {MODE_DESCRIPTIONS[mode]}
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
