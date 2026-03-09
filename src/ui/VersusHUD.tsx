import { type PieceType } from '../engine';
import { HUD } from './HUD';

interface VersusHUDLeftProps {
  label: string;
  score: number;
  lines: number;
  holdPiece: PieceType | null;
  pendingGarbage: number;
  kos: number;
}

export function VersusHUDLeft({
  label,
  score,
  lines,
  holdPiece,
  pendingGarbage,
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
      {pendingGarbage > 0 && (
        <div className="hud-item">
          <div className="hud-label">INCOMING</div>
          <div className="hud-value" style={{ color: '#FF1744' }}>
            {pendingGarbage}
          </div>
        </div>
      )}
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
