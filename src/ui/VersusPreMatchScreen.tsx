import { useState, useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import './MainMenu.css';

interface VersusPreMatchScreenProps {
  currentLevel: number;
  rankLabel: string;
  onStart: (gravityLevel: number) => void;
  onBack: () => void;
}

export function VersusPreMatchScreen({
  currentLevel,
  rankLabel,
  onStart,
  onBack,
}: VersusPreMatchScreenProps) {
  const [gravityLevel, setGravityLevel] = useState(1);

  const items: MenuItemType[] = useMemo(
    () => [
      {
        kind: 'slider' as const,
        value: gravityLevel,
        min: 1,
        max: 15,
        step: 1,
        onChange: setGravityLevel,
      },
      { kind: 'button' as const, onActivate: () => onStart(gravityLevel) },
      { kind: 'button' as const, onActivate: onBack },
    ],
    [gravityLevel, onStart, onBack],
  );

  const { getItemProps } = useMenuNavigation({ items, onEscape: onBack });

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>
        VERSUS AI
      </h2>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
          Level {currentLevel}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
          {rankLabel}
        </div>
      </div>
      <div
        className={`menu-row ${getItemProps(0).className}`}
        onMouseEnter={getItemProps(0).onMouseEnter}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '4px',
        }}
      >
        <label>Gravity Level: {gravityLevel}</label>
        <input
          type="range"
          min={1}
          max={15}
          value={gravityLevel}
          onChange={(e) => setGravityLevel(Number(e.target.value))}
        />
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
          ← → to adjust
        </div>
      </div>
      <div className="menu-buttons">
        <button
          className={`menu-button ${getItemProps(1).className}`}
          onMouseEnter={getItemProps(1).onMouseEnter}
          onClick={getItemProps(1).onClick}
        >
          START MATCH
        </button>
        <button
          className={`menu-button ${getItemProps(2).className}`}
          onMouseEnter={getItemProps(2).onMouseEnter}
          onClick={getItemProps(2).onClick}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
