import { useRef, useEffect } from 'react';
import { type PieceType } from '../engine';
import { drawPiecePreview } from '../renderer';

function ScoreDisplay({ score }: { score: number }) {
  return (
    <div className="hud-item">
      <div className="hud-label">SCORE</div>
      <div className="hud-value">{score.toLocaleString()}</div>
    </div>
  );
}

function LevelDisplay({ level }: { level: number }) {
  return (
    <div className="hud-item">
      <div className="hud-label">LEVEL</div>
      <div className="hud-value">{level}</div>
    </div>
  );
}

function LinesDisplay({ lines }: { lines: number }) {
  return (
    <div className="hud-item">
      <div className="hud-label">LINES</div>
      <div className="hud-value">{lines}</div>
    </div>
  );
}

function HoldPiece({ pieceType }: { pieceType: PieceType | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pieceType) {
      drawPiecePreview(ctx, pieceType, 20); // 20px cell size for preview
    }
  }, [pieceType]);

  return (
    <div className="hud-item">
      <div className="hud-label">HOLD</div>
      <canvas ref={canvasRef} width={100} height={60} />
    </div>
  );
}

function NextQueue({ queue }: { queue: PieceType[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellSize = 18;
    const rowHeight = cellSize * 3 + cellSize * 0.5; // 3 rows + gap
    queue.slice(0, 5).forEach((type, i) => {
      ctx.save();
      ctx.translate(0, i * rowHeight);
      drawPiecePreview(ctx, type, cellSize);
      ctx.restore();
    });
  }, [queue]);

  return (
    <div className="hud-item">
      <div className="hud-label">NEXT</div>
      <canvas ref={canvasRef} width={100} height={320} />
    </div>
  );
}

function TimerDisplay({ remainingMs }: { remainingMs: number }) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isWarning = remainingMs <= 10_000;

  return (
    <div className={`hud-item ${isWarning ? 'timer-warning' : ''}`}>
      <div className="hud-label">TIME</div>
      <div className="hud-value">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  );
}

export const HUD = {
  ScoreDisplay,
  LevelDisplay,
  LinesDisplay,
  HoldPiece,
  NextQueue,
  TimerDisplay,
};
