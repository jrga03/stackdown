import { useRef, useEffect, useCallback, useState } from 'react';
import { GameMode, type GameSnapshot } from '../engine';
import { GARBAGE_BAR_WIDTH } from '../renderer';
import { useVersusSession } from './useVersusSession';
import { useScoreboard } from '../hooks/useScoreboard';
import { type PlayerXP, type XPGainResult } from '../hooks/usePlayerXP';
import { VersusHUDLeft, VersusHUDRight } from './VersusHUD';
import { HUD } from './HUD';
import { PauseOverlay } from './PauseOverlay';
import { VersusGameOverOverlay } from './VersusGameOverOverlay';
import './GameScreen.css';

interface VersusScreenProps {
  gravityLevel: number;
  playerXP: PlayerXP;
  onQuit: () => void;
  onRematch: (gravityLevel: number) => void;
}

export function VersusScreen({ gravityLevel, playerXP, onQuit, onRematch }: VersusScreenProps) {
  const playerCanvasRef = useRef<HTMLCanvasElement>(null);
  const aiCanvasRef = useRef<HTMLCanvasElement>(null);
  const { addXP } = playerXP;

  const [aiLevel] = useState(() => {
    const variance = Math.floor(Math.random() * 11) - 5; // -5 to +5
    return Math.max(1, Math.min(100, playerXP.level + variance));
  });
  const { addScore } = useScoreboard();
  const [xpResult, setXpResult] = useState<XPGainResult | null>(null);

  const handleMatchEnd = useCallback(
    (_result: 'win' | 'lose', playerSnap: GameSnapshot) => {
      setXpResult(addXP(playerSnap.score));
      addScore(GameMode.VERSUS, {
        score: playerSnap.score,
        level: gravityLevel,
        lines: playerSnap.linesCleared,
      });
    },
    [addXP, addScore, gravityLevel],
  );

  const { gameState, resume, resizePlayer, resizeAI } = useVersusSession(
    playerCanvasRef,
    aiCanvasRef,
    aiLevel,
    gravityLevel,
    handleMatchEnd,
  );

  // Responsive canvas sizing
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const padding = 80;
      const gap = 40;
      const sidePanelWidth = 130 * 4; // Four side panels total (left+right per board)

      // Each board gets half the remaining width
      const availableWidth = (vw - gap - sidePanelWidth - padding) / 2;
      const availableHeight = vh - padding - 40; // extra for timer bar

      const cellSizeW = Math.floor(availableWidth / 10);
      const cellSizeH = Math.floor(availableHeight / 20);
      const cellSize = Math.min(cellSizeW, cellSizeH);

      const width = cellSize * 10;
      const height = cellSize * 20;

      if (playerCanvasRef.current) {
        playerCanvasRef.current.width = width + GARBAGE_BAR_WIDTH;
        playerCanvasRef.current.height = height;
        resizePlayer(width, height);
      }
      if (aiCanvasRef.current) {
        aiCanvasRef.current.width = width + GARBAGE_BAR_WIDTH;
        aiCanvasRef.current.height = height;
        resizeAI(width, height);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizePlayer, resizeAI]);

  const handleRematch = useCallback(() => {
    onRematch(gravityLevel);
  }, [gravityLevel, onRematch]);

  return (
    <div className="game-screen">
      {/* Match timer at top */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '10px',
        }}
      >
        <HUD.TimerDisplay remainingMs={gameState.remainingMs} />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '8px',
          flex: 1,
          padding: '10px 20px 20px',
        }}
      >
        {/* Player side: [Left Panel] [Canvas] [Right Panel] */}
        <div className="side-panel left">
          <VersusHUDLeft
            label="YOU"
            score={gameState.playerScore}
            lines={gameState.playerLines}
            holdPiece={gameState.playerHoldPiece}
            kos={gameState.playerKOs}
          />
        </div>
        <div className="playfield-container">
          <canvas ref={playerCanvasRef} />
        </div>
        <div className="side-panel right">
          <VersusHUDRight nextQueue={gameState.playerNextQueue} />
        </div>

        {/* Central VS divider */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minWidth: '30px',
            paddingTop: '20px',
          }}
        >
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>VS</div>
        </div>

        {/* AI side: [Left Panel] [Canvas] [Right Panel] */}
        <div className="side-panel left">
          <VersusHUDLeft
            label={`AI Lv.${aiLevel}`}
            score={gameState.aiScore}
            lines={gameState.aiLines}
            holdPiece={gameState.aiHoldPiece}
            kos={gameState.aiKOs}
          />
        </div>
        <div className="playfield-container">
          <canvas ref={aiCanvasRef} />
        </div>
        <div className="side-panel right">
          <VersusHUDRight nextQueue={gameState.aiNextQueue} />
        </div>
      </div>

      {gameState.isPaused && (
        <PauseOverlay onResume={resume} onRestart={handleRematch} onQuit={onQuit} />
      )}

      {gameState.matchResult !== 'playing' && (
        <VersusGameOverOverlay
          result={gameState.matchResult}
          playerScore={gameState.playerScore}
          aiScore={gameState.aiScore}
          playerKOs={gameState.playerKOs}
          aiKOs={gameState.aiKOs}
          matchEndReason={gameState.matchEndReason}
          xpResult={xpResult}
          onRematch={handleRematch}
          onMainMenu={onQuit}
        />
      )}
    </div>
  );
}
