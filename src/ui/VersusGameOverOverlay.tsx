import { useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import { type MatchEndReason } from '../game/VersusSession';
import { type XPGainResult, getRankLabel } from '../hooks/usePlayerXP';
import { formatGameTime, type GameStats } from '../stats';

interface VersusGameOverOverlayProps {
  result: 'win' | 'lose';
  playerScore: number;
  aiScore: number;
  playerKOs: number;
  aiKOs: number;
  matchEndReason: MatchEndReason | null;
  xpResult: XPGainResult | null;
  gameStats: GameStats | null;
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
  xpResult,
  gameStats,
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
        {xpResult && (
          <div className="xp-section">
            <div className="xp-gained">+{xpResult.xpGained.toLocaleString()} XP</div>
            {xpResult.didLevelUp && (
              <div className="level-up-notice">LEVEL UP!</div>
            )}
            <div className="xp-progress">
              Level {xpResult.newLevel} — {getRankLabel(xpResult.newLevel)}
              {xpResult.xpRequiredForLevel > 0 && (
                <> ({xpResult.newXPInLevel.toLocaleString()} / {xpResult.xpRequiredForLevel.toLocaleString()} XP)</>
              )}
            </div>
          </div>
        )}
        {gameStats && (
          <div className="game-stats-breakdown">
            <div className="stats-row">
              <span>Pieces</span><span>{gameStats.piecesPlaced}</span>
            </div>
            <div className="stats-row">
              <span>Lines Sent</span><span>{gameStats.attackLinesSent}</span>
            </div>
            <div className="stats-row">
              <span>Garbage Recv</span><span>{gameStats.garbageReceived}</span>
            </div>
            {gameStats.quads > 0 && <div className="stats-row"><span>Tetrises</span><span>{gameStats.quads}</span></div>}
            {(gameStats.tSpinSingles + gameStats.tSpinDoubles + gameStats.tSpinTriples + gameStats.tSpinZeros) > 0 && (
              <div className="stats-row"><span>T-Spins</span><span>{gameStats.tSpinZeros + gameStats.tSpinSingles + gameStats.tSpinDoubles + gameStats.tSpinTriples}</span></div>
            )}
            {gameStats.maxCombo > 0 && <div className="stats-row"><span>Max Combo</span><span>{gameStats.maxCombo}</span></div>}
            {gameStats.backToBacks > 0 && <div className="stats-row"><span>Back-to-Back</span><span>{gameStats.backToBacks}</span></div>}
            <div className="stats-row">
              <span>Time</span><span>{formatGameTime(gameStats.elapsedMs)}</span>
            </div>
          </div>
        )}
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
