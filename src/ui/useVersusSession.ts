import { useRef, useEffect, useState, useCallback } from 'react';
import { VersusSession, type VersusSnapshot, type MatchEndReason } from '../game/VersusSession';
import { type PieceType, type GameSnapshot } from '../engine';

function arraysEqual(a: PieceType[], b: PieceType[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface VersusUIState {
  playerScore: number;
  playerLines: number;
  playerHoldPiece: PieceType | null;
  playerNextQueue: PieceType[];
  aiScore: number;
  aiLines: number;
  aiHoldPiece: PieceType | null;
  aiNextQueue: PieceType[];
  playerPendingGarbage: number;
  aiPendingGarbage: number;
  playerKOs: number;
  aiKOs: number;
  remainingMs: number;
  isPaused: boolean;
  matchResult: 'playing' | 'win' | 'lose';
  matchEndReason: MatchEndReason | null;
}

export function useVersusSession(
  playerCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  aiCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  aiLevel: number,
  gravityLevel: number,
  onMatchEnd?: (result: 'win' | 'lose', playerSnapshot: GameSnapshot) => void,
) {
  const sessionRef = useRef<VersusSession | null>(null);
  const aiLevelRef = useRef(aiLevel);
  const matchEndFiredRef = useRef(false);
  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  const [gameState, setGameState] = useState<VersusUIState>({
    playerScore: 0,
    playerLines: 0,
    playerHoldPiece: null,
    playerNextQueue: [],
    aiScore: 0,
    aiLines: 0,
    aiHoldPiece: null,
    aiNextQueue: [],
    playerPendingGarbage: 0,
    aiPendingGarbage: 0,
    playerKOs: 0,
    aiKOs: 0,
    remainingMs: 120_000,
    isPaused: false,
    matchResult: 'playing',
    matchEndReason: null,
  });

  useEffect(() => {
    if (!playerCanvasRef.current || !aiCanvasRef.current) return;

    matchEndFiredRef.current = false;

    const session = new VersusSession(
      playerCanvasRef.current,
      aiCanvasRef.current,
      aiLevelRef.current,
      gravityLevel,
    );
    sessionRef.current = session;

    session.onStateUpdate((snapshot: VersusSnapshot) => {
      const pq = snapshot.player.nextQueue.slice(0, 5);
      const aq = snapshot.ai.nextQueue.slice(0, 5);

      setGameState((prev) => ({
        playerScore: snapshot.player.score,
        playerLines: snapshot.player.linesCleared,
        playerHoldPiece: snapshot.player.holdPiece,
        playerNextQueue: arraysEqual(prev.playerNextQueue, pq) ? prev.playerNextQueue : pq,
        aiScore: snapshot.ai.score,
        aiLines: snapshot.ai.linesCleared,
        aiHoldPiece: snapshot.ai.holdPiece,
        aiNextQueue: arraysEqual(prev.aiNextQueue, aq) ? prev.aiNextQueue : aq,
        playerPendingGarbage: snapshot.playerPendingGarbage,
        aiPendingGarbage: snapshot.aiPendingGarbage,
        playerKOs: snapshot.playerKOs,
        aiKOs: snapshot.aiKOs,
        remainingMs: snapshot.remainingMs,
        isPaused: snapshot.player.isPaused,
        matchResult: snapshot.matchResult,
        matchEndReason: snapshot.matchEndReason,
      }));

      // Fire onMatchEnd callback once when match ends
      if (snapshot.matchResult !== 'playing' && !matchEndFiredRef.current) {
        matchEndFiredRef.current = true;
        onMatchEndRef.current?.(snapshot.matchResult, snapshot.player);
      }
    });

    session.start();

    return () => {
      session.destroy();
      sessionRef.current = null;
    };
  }, [gravityLevel]);

  const resume = useCallback(() => sessionRef.current?.resume(), []);
  const resizePlayer = useCallback(
    (w: number, h: number) => sessionRef.current?.resizePlayer(w, h),
    [],
  );
  const resizeAI = useCallback(
    (w: number, h: number) => sessionRef.current?.resizeAI(w, h),
    [],
  );

  return { gameState, resume, resizePlayer, resizeAI };
}
