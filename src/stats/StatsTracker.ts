import { EventBus, GameEventType, type GameSnapshot } from '../engine';
import type { GameStats } from './types';

/**
 * Subscribes to EventBus and accumulates per-game stats counters.
 * Pure integer increments — O(1) per event, zero heap allocations.
 */
export class StatsTracker {
  private piecesPlaced = 0;
  private holdsUsed = 0;
  private hardDrops = 0;
  private singles = 0;
  private doubles = 0;
  private triples = 0;
  private quads = 0;
  private tSpinZeros = 0;
  private tSpinSingles = 0;
  private tSpinDoubles = 0;
  private tSpinTriples = 0;
  private tSpinMiniZeros = 0;
  private tSpinMiniSingles = 0;
  private tSpinMiniDoubles = 0;
  private maxCombo = 0;
  private backToBacks = 0;
  private attackLinesSent = 0;
  private garbageReceived = 0;

  private unsubscribers: (() => void)[] = [];

  constructor(eventBus: EventBus) {
    this.unsubscribers.push(
      eventBus.on(GameEventType.PIECE_LOCKED, () => {
        this.piecesPlaced++;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.PIECE_HELD, () => {
        this.holdsUsed++;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.HARD_DROP_IMPACT, () => {
        this.hardDrops++;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.LINE_CLEAR, (e) => {
        if (e.isTSpin) {
          if (e.count === 1) this.tSpinSingles++;
          else if (e.count === 2) this.tSpinDoubles++;
          else if (e.count === 3) this.tSpinTriples++;
        } else if (e.isTSpinMini) {
          if (e.count === 1) this.tSpinMiniSingles++;
          else if (e.count === 2) this.tSpinMiniDoubles++;
        } else {
          if (e.count === 1) this.singles++;
          else if (e.count === 2) this.doubles++;
          else if (e.count === 3) this.triples++;
          else if (e.count === 4) this.quads++;
        }

        if (e.isBackToBack) this.backToBacks++;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.TSPIN, (e) => {
        if (e.linesCleared === 0) this.tSpinZeros++;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.TSPIN_MINI, (e) => {
        if (e.linesCleared === 0) this.tSpinMiniZeros++;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.COMBO, (e) => {
        if (e.count > this.maxCombo) this.maxCombo = e.count;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.ATTACK_SENT, (e) => {
        this.attackLinesSent += e.lines;
      }),
    );

    this.unsubscribers.push(
      eventBus.on(GameEventType.GARBAGE_RECEIVED, (e) => {
        this.garbageReceived += e.lines;
      }),
    );
  }

  /** Returns accumulated stats, filling in final snapshot values. */
  getGameStats(snapshot: GameSnapshot, completed: boolean): GameStats {
    return {
      piecesPlaced: this.piecesPlaced,
      holdsUsed: this.holdsUsed,
      hardDrops: this.hardDrops,
      score: snapshot.score,
      level: snapshot.level,
      linesCleared: snapshot.linesCleared,
      elapsedMs: snapshot.elapsedMs,
      completed,
      singles: this.singles,
      doubles: this.doubles,
      triples: this.triples,
      quads: this.quads,
      tSpinZeros: this.tSpinZeros,
      tSpinSingles: this.tSpinSingles,
      tSpinDoubles: this.tSpinDoubles,
      tSpinTriples: this.tSpinTriples,
      tSpinMiniZeros: this.tSpinMiniZeros,
      tSpinMiniSingles: this.tSpinMiniSingles,
      tSpinMiniDoubles: this.tSpinMiniDoubles,
      maxCombo: this.maxCombo,
      backToBacks: this.backToBacks,
      attackLinesSent: this.attackLinesSent,
      garbageReceived: this.garbageReceived,
    };
  }

  /** Unsubscribes from all events. */
  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
