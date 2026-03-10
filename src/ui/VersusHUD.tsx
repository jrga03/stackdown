import { type PieceType } from '../engine';
import { HUD } from './HUD';

interface VersusHUDLeftProps {
  label: string;
  score: number;
  lines: number;
  holdPiece: PieceType | null;
  kos: number;
}

export function VersusHUDLeft({
  label,
  score,
  lines,
  holdPiece,
  kos,
}: VersusHUDLeftProps) {
  return (
    <div className="versus-hud">
      <div className="hud-label" style={{ fontSize: '14px', marginBottom: '8px' }}>
        {label}
      </div>
      <HUD.HoldPiece pieceType={holdPiece} />
      <HUD.ScoreDisplay score={score} />
      <HUD.LinesDisplay lines={lines} />
      <div className="hud-item">
        <div className="hud-label">KOs</div>
        <div className="hud-value" style={{ color: kos > 0 ? '#FF1744' : undefined }}>
          {kos}
        </div>
      </div>
    </div>
  );
}

interface VersusHUDRightProps {
  nextQueue: PieceType[];
}

export function VersusHUDRight({ nextQueue }: VersusHUDRightProps) {
  return (
    <div className="versus-hud">
      <HUD.NextQueue queue={nextQueue} />
    </div>
  );
}
