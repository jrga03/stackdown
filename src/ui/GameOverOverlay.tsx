import { useMemo } from 'react';
import { GameMode } from '../engine';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import { type ScoreEntry } from '../hooks/useScoreboard';
import { type XPGainResult } from '../hooks/usePlayerXP';

interface GameOverOverlayProps {
  score: number;
  level: number;
  lines: number;
  gameMode: GameMode;
  entries: ScoreEntry[];
  currentRank: number | null;
  xpResult: XPGainResult | null;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOverOverlay({
  score,
  level,
  lines,
  gameMode,
  entries,
  currentRank,
  xpResult,
  onPlayAgain,
  onMainMenu,
}: GameOverOverlayProps) {
  const isNewBest = currentRank === 0;

  const items: MenuItemType[] = useMemo(
    () => [
      { kind: 'button', onActivate: onPlayAgain },
      { kind: 'button', onActivate: onMainMenu },
    ],
    [onPlayAgain, onMainMenu],
  );

  const { getItemProps } = useMenuNavigation({ items, onEscape: onMainMenu });

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>{gameMode === GameMode.PRACTICE ? "TIME'S UP!" : 'GAME OVER'}</h2>
        {isNewBest && <div className="new-best">NEW PERSONAL BEST!</div>}
        <div className="mode-label">
          {gameMode === GameMode.MARATHON ? 'Marathon' : 'Practice'}
        </div>
        <div className="final-stats">
          <div>Score: {score.toLocaleString()}</div>
          <div>Level: {level}</div>
          <div>Lines: {lines}</div>
        </div>
        {xpResult && (
          <div className="xp-section">
            <div className="xp-gained">+{xpResult.xpGained.toLocaleString()} XP</div>
            {xpResult.didLevelUp && (
              <div className="level-up-notice">LEVEL UP!</div>
            )}
            <div className="xp-progress">
              Level {xpResult.newLevel}
              {xpResult.xpRequiredForLevel > 0 && (
                <> — {xpResult.newXPInLevel.toLocaleString()} / {xpResult.xpRequiredForLevel.toLocaleString()} XP</>
              )}
            </div>
          </div>
        )}
        <div className="scoreboard-header">TOP 5</div>
        <div className="scoreboard-list">
          {Array.from({ length: 5 }, (_, i) => {
            const entry = entries[i];
            const isHighlighted = currentRank === i;
            return (
              <div
                key={i}
                className={`scoreboard-row${isHighlighted ? ' scoreboard-row-highlight' : ''}`}
              >
                <span style={{ width: 20 }}>{i + 1}.</span>
                {entry ? (
                  <>
                    <span style={{ width: 80, textAlign: 'right' }}>{entry.score.toLocaleString()}</span>
                    <span style={{ width: 40, textAlign: 'right' }}>L{entry.level}</span>
                    <span style={{ width: 50, textAlign: 'right' }}>{entry.lines}ln</span>
                    <span style={{ width: 80, textAlign: 'right' }}>{entry.date || '\u2014'}</span>
                  </>
                ) : (
                  <span>{'\u2014'}</span>
                )}
              </div>
            );
          })}
        </div>
        <button className={`menu-button ${getItemProps(0).className}`} onMouseEnter={getItemProps(0).onMouseEnter} onClick={getItemProps(0).onClick}>
          PLAY AGAIN
        </button>
        <button className={`menu-button ${getItemProps(1).className}`} onMouseEnter={getItemProps(1).onMouseEnter} onClick={getItemProps(1).onClick}>
          MAIN MENU
        </button>
      </div>
    </div>
  );
}
