import { useRef, useEffect, useState, useMemo } from 'react';
import { useGameSession } from './useGameSession';
import { HUD } from './HUD';
import { PauseOverlay } from './PauseOverlay';
import { GameOverOverlay } from './GameOverOverlay';
import { useScoreboard } from '../hooks/useScoreboard';
import { type GameConfig, GameMode } from '../engine';
import { type XPGainResult } from '../hooks/usePlayerXP';
import { StatsTracker, type GameStats } from '../stats';
import './GameScreen.css';

interface GameScreenProps {
  gameConfig: GameConfig;
  onQuit: () => void;
  addXP: (xp: number) => XPGainResult;
  recordGame: (
    gameStats: GameStats,
    mode: GameMode,
    versusResult?: 'win' | 'lose',
  ) => void;
}

export function GameScreen({ gameConfig, onQuit, addXP, recordGame }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, sessionRef, resume, restart, resize } = useGameSession(
    canvasRef,
    gameConfig,
  );
  const { scoreboard, addScore } = useScoreboard();
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [xpResult, setXpResult] = useState<XPGainResult | null>(null);
  const [lastGameStats, setLastGameStats] = useState<GameStats | null>(null);
  const trackerRef = useRef<StatsTracker | null>(null);
  const statsRecordedRef = useRef(false);

  // Create StatsTracker when session is ready
  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;
    trackerRef.current = new StatsTracker(session.getEventBus());
    statsRecordedRef.current = false;
    return () => {
      trackerRef.current?.destroy();
      trackerRef.current = null;
    };
  }, [sessionRef.current]);

  // Record score, XP, and stats when game ends
  useEffect(() => {
    if (gameState.isGameOver) {
      const { rank } = addScore(gameState.gameMode, {
        score: gameState.score,
        level: gameState.level,
        lines: gameState.linesCleared,
      });
      setCurrentRank(rank);
      setXpResult(addXP(gameState.score));

      if (trackerRef.current && sessionRef.current && !statsRecordedRef.current) {
        statsRecordedRef.current = true;
        const stats = trackerRef.current.getGameStats(
          sessionRef.current.getSnapshot(),
          true,
        );
        setLastGameStats(stats);
        recordGame(stats, gameConfig.mode);
      }
    }
  }, [gameState.isGameOver]);

  const entries = useMemo(() => {
    const key = gameState.gameMode === GameMode.MARATHON ? 'marathon' : 'practice';
    return scoreboard[key];
  }, [scoreboard, gameState.gameMode]);

  // Record abandoned game stats on quit
  const handleQuit = () => {
    if (trackerRef.current && sessionRef.current && !statsRecordedRef.current) {
      statsRecordedRef.current = true;
      const stats = trackerRef.current.getGameStats(
        sessionRef.current.getSnapshot(),
        false,
      );
      recordGame(stats, gameConfig.mode);
    }
    onQuit();
  };

  // Reset rank on restart
  const handleRestart = () => {
    setCurrentRank(null);
    setXpResult(null);
    setLastGameStats(null);
    // Record abandoned stats if game wasn't completed before restart
    if (trackerRef.current && sessionRef.current && !statsRecordedRef.current) {
      const stats = trackerRef.current.getGameStats(
        sessionRef.current.getSnapshot(),
        false,
      );
      recordGame(stats, gameConfig.mode);
    }
    // Destroy old tracker before restart (restart creates a new EventBus)
    trackerRef.current?.destroy();
    statsRecordedRef.current = false;
    restart();
    // Recreate tracker with the new EventBus
    if (sessionRef.current) {
      trackerRef.current = new StatsTracker(sessionRef.current.getEventBus());
    }
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
        <PauseOverlay onResume={resume} onRestart={handleRestart} onQuit={handleQuit} />
      )}
      {gameState.isGameOver && (
        <GameOverOverlay
          score={gameState.score}
          level={gameState.level}
          lines={gameState.linesCleared}
          gameMode={gameState.gameMode}
          entries={entries}
          currentRank={currentRank}
          xpResult={xpResult}
          gameStats={lastGameStats}
          onPlayAgain={handleRestart}
          onMainMenu={onQuit}
        />
      )}
    </div>
  );
}
