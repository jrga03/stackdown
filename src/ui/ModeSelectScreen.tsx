import { useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import './MainMenu.css';

interface ModeSelectProps {
  onMarathon: () => void;
  onPractice: () => void;
  onVersus: () => void;
  onBack: () => void;
}

export function ModeSelectScreen({ onMarathon, onPractice, onVersus, onBack }: ModeSelectProps) {
  const items: MenuItemType[] = useMemo(() => [
    { kind: 'button', onActivate: onMarathon },
    { kind: 'button', onActivate: onPractice },
    { kind: 'button', onActivate: onVersus },
    { kind: 'button', onActivate: onBack },
  ], [onMarathon, onPractice, onVersus, onBack]);

  const { getItemProps } = useMenuNavigation({ items, onEscape: onBack });

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>
        SELECT MODE
      </h2>
      <div className="menu-buttons">
        <button
          className={`menu-button ${getItemProps(0).className}`}
          onMouseEnter={getItemProps(0).onMouseEnter}
          onClick={getItemProps(0).onClick}
        >
          MARATHON
        </button>
        <button
          className={`menu-button ${getItemProps(1).className}`}
          onMouseEnter={getItemProps(1).onMouseEnter}
          onClick={getItemProps(1).onClick}
        >
          PRACTICE
        </button>
        <button
          className={`menu-button ${getItemProps(2).className}`}
          onMouseEnter={getItemProps(2).onMouseEnter}
          onClick={getItemProps(2).onClick}
        >
          VERSUS AI
        </button>
        <button
          className={`menu-button ${getItemProps(3).className}`}
          onMouseEnter={getItemProps(3).onMouseEnter}
          onClick={getItemProps(3).onClick}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
