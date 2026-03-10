import { useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import './MainMenu.css';

interface MainMenuProps {
  onPlay: () => void;
  onScores: () => void;
  onStats: () => void;
  onSettings: () => void;
  playerLevel: number;
  rankLabel: string;
}

export function MainMenu({ onPlay, onScores, onStats, onSettings, playerLevel, rankLabel }: MainMenuProps) {
  const items: MenuItemType[] = useMemo(
    () => [
      { kind: 'button', onActivate: onPlay },
      { kind: 'button', onActivate: onScores },
      { kind: 'button', onActivate: onStats },
      { kind: 'button', onActivate: onSettings },
    ],
    [onPlay, onScores, onStats, onSettings],
  );

  const { getItemProps } = useMenuNavigation({ items });

  return (
    <div className="main-menu">
      <h1 className="game-title">STACKDOWN</h1>
      <div className="player-level">Level {playerLevel} — {rankLabel}</div>
      <div className="menu-buttons">
        <button className={`menu-button ${getItemProps(0).className}`} onMouseEnter={getItemProps(0).onMouseEnter} onClick={getItemProps(0).onClick}>
          PLAY
        </button>
        <button className={`menu-button ${getItemProps(1).className}`} onMouseEnter={getItemProps(1).onMouseEnter} onClick={getItemProps(1).onClick}>
          SCORES
        </button>
        <button className={`menu-button ${getItemProps(2).className}`} onMouseEnter={getItemProps(2).onMouseEnter} onClick={getItemProps(2).onClick}>
          STATS
        </button>
        <button className={`menu-button ${getItemProps(3).className}`} onMouseEnter={getItemProps(3).onMouseEnter} onClick={getItemProps(3).onClick}>
          SETTINGS
        </button>
      </div>
    </div>
  );
}
