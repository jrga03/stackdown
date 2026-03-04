import { useRef, useEffect, useState } from 'react';
import { useGameSession } from './useGameSession';
import { HUD } from './HUD';
import { PauseOverlay } from './PauseOverlay';
import { GameOverOverlay } from './GameOverOverlay';
import { usePersonalBests } from '../hooks/usePersonalBests';
import { type GameConfig, GameMode } from '../engine';
import './GameScreen.css';

interface GameScreenProps {
  gameConfig: GameConfig;
  onQuit: () => void;
}

export function GameScreen({ gameConfig, onQuit }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, resume, restart, resize } = useGameSession(
    canvasRef,
    gameConfig,
  );
  const { checkAndUpdate } = usePersonalBests();
  const [isNewBest, setIsNewBest] = useState(false);

  // Check personal best when game ends
  useEffect(() => {
    if (gameState.isGameOver) {
      const newBest = checkAndUpdate(gameState.gameMode, gameState.score);
      setIsNewBest(newBest);
    }
  }, [gameState.isGameOver]);

  // Reset new best flag on restart
  const handleRestart = () => {
    setIsNewBest(false);
    restart();
  };

  // Responsive canvas sizing
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight;
      const padding = 40;
      const cellSize = Math.floor((vh - padding) / 20);
      const width = cellSize * 10;
      const height = cellSize * 20;
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        resize(width, height);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resize]);

  return (
    <div className="game-screen">
      <div className="game-layout">
        <div className="side-panel left">
          <HUD.HoldPiece pieceType={gameState.holdPiece} />
        </div>
        <div className="playfield-container">
          <canvas ref={canvasRef} />
        </div>
        <div className="side-panel right">
          <HUD.NextQueue queue={gameState.nextQueue} />
          <HUD.ScoreDisplay score={gameState.score} />
          <HUD.LevelDisplay level={gameState.level} />
          <HUD.LinesDisplay lines={gameState.linesCleared} />
          {gameState.gameMode === GameMode.PRACTICE &&
            gameState.remainingMs !== null && (
              <HUD.TimerDisplay remainingMs={gameState.remainingMs} />
            )}
        </div>
      </div>
      {gameState.isPaused && (
        <PauseOverlay onResume={resume} onRestart={handleRestart} onQuit={onQuit} />
      )}
      {gameState.isGameOver && (
        <GameOverOverlay
          score={gameState.score}
          level={gameState.level}
          lines={gameState.linesCleared}
          gameMode={gameState.gameMode}
          isNewBest={isNewBest}
          onPlayAgain={handleRestart}
          onMainMenu={onQuit}
        />
      )}
    </div>
  );
}
