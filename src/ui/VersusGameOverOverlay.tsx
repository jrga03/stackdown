import { useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import { type MatchEndReason } from '../game/VersusSession';

interface VersusGameOverOverlayProps {
  result: 'win' | 'lose';
  playerScore: number;
  aiScore: number;
  playerKOs: number;
  aiKOs: number;
  matchEndReason: MatchEndReason | null;
  previousLevel: number;
  newLevel: number;
  rankLabel: string;
  onRematch: () => void;
  onMainMenu: () => void;
}

const REASON_LABELS: Record<string, string> = {
  knockout: 'KNOCKOUT',
  topout: 'TOP OUT',
  timeout: 'TIME UP',
};

export function VersusGameOverOverlay({
  result,
  playerScore,
  aiScore,
  playerKOs,
  aiKOs,
  matchEndReason,
  previousLevel,
  newLevel,
  rankLabel,
  onRematch,
  onMainMenu,
}: VersusGameOverOverlayProps) {
  const items: MenuItemType[] = useMemo(
    () => [
      { kind: 'button' as const, onActivate: onRematch },
      { kind: 'button' as const, onActivate: onMainMenu },
    ],
    [onRematch, onMainMenu],
  );

  const { getItemProps } = useMenuNavigation({ items, onEscape: onMainMenu });

  const levelChange = newLevel - previousLevel;
  const levelChangeText = levelChange > 0 ? `+${levelChange}` : `${levelChange}`;

  const reasonLabel = matchEndReason ? REASON_LABELS[matchEndReason] ?? '' : '';

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2 style={{ color: result === 'win' ? '#00E676' : '#FF1744' }}>
          {result === 'win' ? 'YOU WIN!' : 'YOU LOSE'}
        </h2>
        {reasonLabel && (
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            {reasonLabel}
          </div>
        )}
        <div className="final-stats">
          <div>Your Score: {playerScore.toLocaleString()}</div>
          <div>AI Score: {aiScore.toLocaleString()}</div>
          <div style={{ marginTop: '4px' }}>
            KOs: You {playerKOs} — AI {aiKOs}
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>
            Level {previousLevel} → {newLevel} ({levelChangeText})
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            Rank: {rankLabel}
          </div>
        </div>
        <button
          className={`menu-button ${getItemProps(0).className}`}
          onMouseEnter={getItemProps(0).onMouseEnter}
          onClick={getItemProps(0).onClick}
        >
          REMATCH
        </button>
        <button
          className={`menu-button ${getItemProps(1).className}`}
          onMouseEnter={getItemProps(1).onMouseEnter}
          onClick={getItemProps(1).onClick}
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
}
