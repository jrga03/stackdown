import { useMemo } from 'react';
import { GameMode } from '../engine';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';

interface GameOverOverlayProps {
  score: number;
  level: number;
  lines: number;
  gameMode: GameMode;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOverOverlay({
  score,
  level,
  lines,
  gameMode,
  isNewBest,
  onPlayAgain,
  onMainMenu,
}: GameOverOverlayProps) {
  const items: MenuItemType[] = useMemo(
    () => [
      { kind: 'button', onActivate: onPlayAgain },
      { kind: 'button', onActivate: onMainMenu },
    ],
    [onPlayAgain, onMainMenu],
  );

  const { getItemProps } = useMenuNavigation({ items, onEscape: onMainMenu });

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>{gameMode === GameMode.PRACTICE ? "TIME'S UP!" : 'GAME OVER'}</h2>
        {isNewBest && <div className="new-best">NEW PERSONAL BEST!</div>}
        <div className="mode-label">
          {gameMode === GameMode.MARATHON ? 'Marathon' : 'Practice'}
        </div>
        <div className="final-stats">
          <div>Score: {score.toLocaleString()}</div>
          <div>Level: {level}</div>
          <div>Lines: {lines}</div>
        </div>
        <button className={`menu-button ${getItemProps(0).className}`} onMouseEnter={getItemProps(0).onMouseEnter} onClick={getItemProps(0).onClick}>
          PLAY AGAIN
        </button>
        <button className={`menu-button ${getItemProps(1).className}`} onMouseEnter={getItemProps(1).onMouseEnter} onClick={getItemProps(1).onClick}>
          MAIN MENU
        </button>
      </div>
    </div>
  );
}
