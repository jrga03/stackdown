import { useMemo } from 'react';
import { GameMode } from '../engine';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import { type ScoreEntry } from '../hooks/useScoreboard';
import { type XPGainResult } from '../hooks/usePlayerXP';
import { formatGameTime, type GameStats } from '../stats';

interface GameOverOverlayProps {
  score: number;
  level: number;
  lines: number;
  gameMode: GameMode;
  entries: ScoreEntry[];
  currentRank: number | null;
  xpResult: XPGainResult | null;
  gameStats: GameStats | null;
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
  gameStats,
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
        {gameStats && (
          <div className="game-stats-breakdown">
            <div className="stats-row">
              <span>Pieces</span><span>{gameStats.piecesPlaced}</span>
            </div>
            <div className="stats-row">
              <span>Hard Drops</span><span>{gameStats.hardDrops}</span>
            </div>
            <div className="stats-row">
              <span>Holds</span><span>{gameStats.holdsUsed}</span>
            </div>
            {gameStats.singles > 0 && <div className="stats-row"><span>Singles</span><span>{gameStats.singles}</span></div>}
            {gameStats.doubles > 0 && <div className="stats-row"><span>Doubles</span><span>{gameStats.doubles}</span></div>}
            {gameStats.triples > 0 && <div className="stats-row"><span>Triples</span><span>{gameStats.triples}</span></div>}
            {gameStats.quads > 0 && <div className="stats-row"><span>Tetrises</span><span>{gameStats.quads}</span></div>}
            {(gameStats.tSpinSingles + gameStats.tSpinDoubles + gameStats.tSpinTriples + gameStats.tSpinZeros) > 0 && (
              <div className="stats-row"><span>T-Spins</span><span>{gameStats.tSpinZeros + gameStats.tSpinSingles + gameStats.tSpinDoubles + gameStats.tSpinTriples}</span></div>
            )}
            {(gameStats.tSpinMiniZeros + gameStats.tSpinMiniSingles + gameStats.tSpinMiniDoubles) > 0 && (
              <div className="stats-row"><span>T-Spin Minis</span><span>{gameStats.tSpinMiniZeros + gameStats.tSpinMiniSingles + gameStats.tSpinMiniDoubles}</span></div>
            )}
            {gameStats.maxCombo > 0 && <div className="stats-row"><span>Max Combo</span><span>{gameStats.maxCombo}</span></div>}
            {gameStats.backToBacks > 0 && <div className="stats-row"><span>Back-to-Back</span><span>{gameStats.backToBacks}</span></div>}
            <div className="stats-row">
              <span>Time</span><span>{formatGameTime(gameStats.elapsedMs)}</span>
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
