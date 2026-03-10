import { useState, useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import { combineStats, formatPlayTime, type LifetimeModeStat, type StoredStats } from '../stats';
import './StatsScreen.css';

interface StatsScreenProps {
  stats: StoredStats;
  onBack: () => void;
}

type TabKey = 'all' | 'marathon' | 'practice' | 'versus';

const TAB_LABELS: TabKey[] = ['all', 'marathon', 'practice', 'versus'];
const TAB_DISPLAY = ['ALL', 'MARATHON', 'PRACTICE', 'VERSUS'];

export function StatsScreen({ stats, onBack }: StatsScreenProps) {
  const [tab, setTab] = useState<TabKey>('all');
  const tabIndex = TAB_LABELS.indexOf(tab);

  const modeStat: LifetimeModeStat = useMemo(() => {
    if (tab === 'all') return combineStats(stats.marathon, stats.practice, stats.versus);
    return stats[tab];
  }, [stats, tab]);

  const isVersus = tab === 'versus' || tab === 'all';

  const items: MenuItemType[] = useMemo(
    () => [
      {
        kind: 'toggle',
        options: TAB_DISPLAY,
        selectedIndex: tabIndex,
        onChange: (i: number) => setTab(TAB_LABELS[i] ?? 'all'),
      },
      { kind: 'button', onActivate: onBack },
    ],
    [tabIndex, onBack],
  );

  const { getItemProps } = useMenuNavigation({ items, onEscape: onBack });

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>
        STATS
      </h2>
      <div
        className={`menu-row ${getItemProps(0).className}`}
        onMouseEnter={getItemProps(0).onMouseEnter}
        style={{ display: 'flex', gap: '8px', padding: '4px', flexWrap: 'wrap', justifyContent: 'center' }}
      >
        {TAB_DISPLAY.map((label, i) => (
          <button
            key={label}
            className="menu-button"
            style={{
              background: tabIndex === i ? 'rgba(255,255,255,0.25)' : undefined,
              fontSize: '13px',
              padding: '6px 12px',
            }}
            onClick={() => setTab(TAB_LABELS[i] ?? 'all')}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
        &larr; &rarr; to switch tab
      </div>

      {modeStat.gamesPlayed === 0 ? (
        <div className="stats-empty">No games played yet.</div>
      ) : (
        <div className="stats-grid">
          <div className="stats-section">
            <div className="stats-section-title">GENERAL</div>
            <div className="stats-line"><span>Games Played</span><span>{modeStat.gamesPlayed}</span></div>
            <div className="stats-line"><span>Completed</span><span>{modeStat.gamesCompleted}</span></div>
            <div className="stats-line"><span>Abandoned</span><span>{modeStat.gamesAbandoned}</span></div>
            <div className="stats-line"><span>Total Score</span><span>{modeStat.totalScore.toLocaleString()}</span></div>
            <div className="stats-line"><span>High Score</span><span>{modeStat.highScore.toLocaleString()}</span></div>
            <div className="stats-line"><span>Total Lines</span><span>{modeStat.totalLines}</span></div>
            <div className="stats-line"><span>Time Played</span><span>{formatPlayTime(modeStat.totalElapsedMs)}</span></div>
            <div className="stats-line"><span>Pieces Placed</span><span>{modeStat.piecesPlaced}</span></div>
            <div className="stats-line"><span>Hard Drops</span><span>{modeStat.hardDrops}</span></div>
            <div className="stats-line"><span>Holds Used</span><span>{modeStat.holdsUsed}</span></div>
          </div>

          <div className="stats-section">
            <div className="stats-section-title">LINE CLEARS</div>
            <div className="stats-line"><span>Singles</span><span>{modeStat.singles}</span></div>
            <div className="stats-line"><span>Doubles</span><span>{modeStat.doubles}</span></div>
            <div className="stats-line"><span>Triples</span><span>{modeStat.triples}</span></div>
            <div className="stats-line"><span>Tetrises</span><span>{modeStat.quads}</span></div>
          </div>

          <div className="stats-section">
            <div className="stats-section-title">T-SPINS</div>
            <div className="stats-line"><span>T-Spin Zero</span><span>{modeStat.tSpinZeros}</span></div>
            <div className="stats-line"><span>T-Spin Single</span><span>{modeStat.tSpinSingles}</span></div>
            <div className="stats-line"><span>T-Spin Double</span><span>{modeStat.tSpinDoubles}</span></div>
            <div className="stats-line"><span>T-Spin Triple</span><span>{modeStat.tSpinTriples}</span></div>
            <div className="stats-line"><span>Mini Zero</span><span>{modeStat.tSpinMiniZeros}</span></div>
            <div className="stats-line"><span>Mini Single</span><span>{modeStat.tSpinMiniSingles}</span></div>
            <div className="stats-line"><span>Mini Double</span><span>{modeStat.tSpinMiniDoubles}</span></div>
          </div>

          <div className="stats-section">
            <div className="stats-section-title">COMBOS</div>
            <div className="stats-line"><span>Max Combo</span><span>{modeStat.maxCombo}</span></div>
            <div className="stats-line"><span>Back-to-Back</span><span>{modeStat.backToBacks}</span></div>
          </div>

          {isVersus && (
            <div className="stats-section">
              <div className="stats-section-title">VERSUS</div>
              <div className="stats-line"><span>Wins</span><span>{modeStat.wins}</span></div>
              <div className="stats-line"><span>Losses</span><span>{modeStat.losses}</span></div>
              <div className="stats-line"><span>Lines Sent</span><span>{modeStat.attackLinesSent}</span></div>
              <div className="stats-line"><span>Garbage Recv</span><span>{modeStat.garbageReceived}</span></div>
            </div>
          )}
        </div>
      )}

      <div className="menu-buttons">
        <button
          className={`menu-button ${getItemProps(1).className}`}
          onMouseEnter={getItemProps(1).onMouseEnter}
          onClick={getItemProps(1).onClick}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
