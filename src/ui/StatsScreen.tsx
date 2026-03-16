import { useState, useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import { combineStats, formatPlayTime, type LifetimeModeStat, type StoredStats } from '../stats';

interface StatsScreenProps {
  stats: StoredStats;
  onBack: () => void;
}

type TabKey = 'all' | 'marathon' | 'practice' | 'versus';

const TAB_LABELS: TabKey[] = ['all', 'marathon', 'practice', 'versus'];
const TAB_DISPLAY = ['ALL', 'MARATHON', 'PRACTICE', 'VERSUS'];

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm leading-[1.8]">
      <span className="text-white/50">{label}</span>
      <span className="text-white/90 tabular-nums">{value}</span>
    </div>
  );
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.04] border border-white/[0.06] rounded-lg p-4 ${className}`}>
      <div className="text-[11px] font-bold tracking-[2.5px] text-white/35 mb-2.5 pb-1.5 border-b border-white/[0.06]">
        {title}
      </div>
      {children}
    </div>
  );
}

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
      <div className="w-[680px] max-w-[90vw] flex flex-col items-center gap-6">
        <h2 className="text-4xl tracking-[4px] font-bold text-white">STATS</h2>

        {/* Hero stats banner */}
        {modeStat.gamesPlayed > 0 && (
          <div className="flex justify-center gap-10">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">
                {modeStat.highScore.toLocaleString()}
              </div>
              <div className="text-[11px] tracking-widest text-white/40 uppercase">
                High Score
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white/90">
                {modeStat.totalLines}
              </div>
              <div className="text-[11px] tracking-widest text-white/40 uppercase">
                Total Lines
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white/90">
                {formatPlayTime(modeStat.totalElapsedMs)}
              </div>
              <div className="text-[11px] tracking-widest text-white/40 uppercase">
                Time Played
              </div>
            </div>
          </div>
        )}

        {/* Segmented tab bar */}
        <div
          className={`flex bg-white/[0.06] rounded-md p-[3px] gap-0.5 ${getItemProps(0).className}`}
          onMouseEnter={getItemProps(0).onMouseEnter}
        >
          {TAB_DISPLAY.map((label, i) => (
            <button
              key={label}
              className={`bg-transparent border-none text-[13px] font-semibold tracking-wider px-5 py-2 rounded cursor-pointer transition-colors ${
                tabIndex === i
                  ? 'bg-white/[0.12] text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
              onClick={() => setTab(TAB_LABELS[i] ?? 'all')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {modeStat.gamesPlayed === 0 ? (
          <div className="text-white/40 text-base py-5">No games played yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 w-full max-h-[50vh] overflow-y-auto">
            {/* GENERAL — full width */}
            <Section title="GENERAL" className="col-span-2">
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <StatRow label="Games Played" value={modeStat.gamesPlayed} />
                  <StatRow label="Completed" value={modeStat.gamesCompleted} />
                  <StatRow label="Abandoned" value={modeStat.gamesAbandoned} />
                  <StatRow label="Total Score" value={modeStat.totalScore.toLocaleString()} />
                </div>
                <div>
                  <StatRow label="Pieces Placed" value={modeStat.piecesPlaced} />
                  <StatRow label="Hard Drops" value={modeStat.hardDrops} />
                  <StatRow label="Holds Used" value={modeStat.holdsUsed} />
                </div>
              </div>
            </Section>

            {/* LINE CLEARS + COMBOS — side by side */}
            <Section title="LINE CLEARS">
              <StatRow label="Singles" value={modeStat.singles} />
              <StatRow label="Doubles" value={modeStat.doubles} />
              <StatRow label="Triples" value={modeStat.triples} />
              <StatRow label="Tetrises" value={modeStat.quads} />
            </Section>

            <Section title="COMBOS">
              <StatRow label="Max Combo" value={modeStat.maxCombo} />
              <StatRow label="Back-to-Back" value={modeStat.backToBacks} />
            </Section>

            {/* T-SPINS + T-SPIN MINIS — side by side */}
            <Section title="T-SPINS">
              <StatRow label="T-Spin Zero" value={modeStat.tSpinZeros} />
              <StatRow label="T-Spin Single" value={modeStat.tSpinSingles} />
              <StatRow label="T-Spin Double" value={modeStat.tSpinDoubles} />
              <StatRow label="T-Spin Triple" value={modeStat.tSpinTriples} />
            </Section>

            <Section title="T-SPIN MINIS">
              <StatRow label="Mini Zero" value={modeStat.tSpinMiniZeros} />
              <StatRow label="Mini Single" value={modeStat.tSpinMiniSingles} />
              <StatRow label="Mini Double" value={modeStat.tSpinMiniDoubles} />
            </Section>

            {/* VERSUS — full width, conditional */}
            {isVersus && (
              <Section title="VERSUS" className="col-span-2">
                <div className="grid grid-cols-2 gap-x-6">
                  <div>
                    <StatRow label="Wins" value={modeStat.wins} />
                    <StatRow label="Losses" value={modeStat.losses} />
                  </div>
                  <div>
                    <StatRow label="Lines Sent" value={modeStat.attackLinesSent} />
                    <StatRow label="Garbage Recv" value={modeStat.garbageReceived} />
                  </div>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* Back button */}
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
    </div>
  );
}
