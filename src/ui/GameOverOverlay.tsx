import { GameMode } from '../engine';

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
        <button className="menu-button" onClick={onPlayAgain}>
          PLAY AGAIN
        </button>
        <button className="menu-button" onClick={onMainMenu}>
          MAIN MENU
        </button>
      </div>
    </div>
  );
}
