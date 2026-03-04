import { useRef, useEffect, useState, useCallback } from 'react';
import { GameSession } from '../game/GameSession';
import { type GameConfig, GameMode, type PieceType } from '../engine';

function arraysEqual(a: PieceType[], b: PieceType[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface GameUIState {
  score: number;
  level: number;
  linesCleared: number;
  holdPiece: PieceType | null;
  nextQueue: PieceType[];
  isPaused: boolean;
  isGameOver: boolean;
  combo: number;
  backToBack: boolean;
  gameMode: GameMode;
  remainingMs: number | null;
}

export function useGameSession(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: GameConfig,
) {
  const sessionRef = useRef<GameSession | null>(null);
  const [gameState, setGameState] = useState<GameUIState>({
    score: 0,
    level: config.startLevel,
    linesCleared: 0,
    holdPiece: null,
    nextQueue: [],
    isPaused: false,
    isGameOver: false,
    combo: -1,
    backToBack: false,
    gameMode: config.mode,
    remainingMs: config.mode === GameMode.PRACTICE ? 120_000 : null,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const session = new GameSession(canvasRef.current, config);
    sessionRef.current = session;

    session.onStateUpdate((snapshot) => {
      const newQueue = snapshot.nextQueue.slice(0, 5);
      setGameState((prev) => ({
        score: snapshot.score,
        level: snapshot.level,
        linesCleared: snapshot.linesCleared,
        holdPiece: snapshot.holdPiece,
        nextQueue: arraysEqual(prev.nextQueue, newQueue) ? prev.nextQueue : newQueue,
        isPaused: snapshot.isPaused,
        isGameOver: snapshot.isGameOver,
        combo: snapshot.combo,
        backToBack: snapshot.backToBack,
        gameMode: snapshot.gameMode,
        remainingMs: snapshot.remainingMs,
      }));
    });

    session.start();
    return () => {
      session.destroy();
      sessionRef.current = null;
    };
  }, [config]);

  const pause = useCallback(() => sessionRef.current?.pause(), []);
  const resume = useCallback(() => sessionRef.current?.resume(), []);
  const restart = useCallback(
    () => sessionRef.current?.restart(config),
    [config],
  );
  const resize = useCallback(
    (w: number, h: number) => sessionRef.current?.resize(w, h),
    [],
  );

  return { gameState, pause, resume, restart, resize };
}
