import {
  GameEngine,
  EventBus,
  GameAction,
  GameMode,
  GameEventType,
  GarbageManager,
  type GameSnapshot,
} from '../engine';
import { GameRenderer } from '../renderer';
import { InputMapper, DASManager, KeyboardManager } from '../input';
import { AIController } from '../ai';
import { VersusLoop } from './VersusLoop';

const MATCH_DURATION_MS = 120_000;
const KOS_TO_LOSE = 2;

export type MatchEndReason = 'knockout' | 'topout' | 'timeout';

export interface VersusSnapshot {
  player: GameSnapshot;
  ai: GameSnapshot;
  playerPendingGarbage: number;
  aiPendingGarbage: number;
  playerKOs: number;
  aiKOs: number;
  remainingMs: number;
  matchResult: 'playing' | 'win' | 'lose';
  matchEndReason: MatchEndReason | null;
}

/**
 * Coordinates a versus match between player and AI.
 * Owns two GameEngine instances, two GameRenderers, one GarbageManager,
 * one AIController, and a single VersusLoop.
 */
export class VersusSession {
  private playerEngine: GameEngine;
  private aiEngine: GameEngine;
  private playerRenderer: GameRenderer;
  private aiRenderer: GameRenderer;
  private playerEventBus: EventBus;
  private aiEventBus: EventBus;
  private garbageManager: GarbageManager;
  private aiController: AIController;

  private inputMapper: InputMapper;
  private dasManager: DASManager;
  private keyboardManager: KeyboardManager;
  private versusLoop: VersusLoop;

  private stateCallback: ((snapshot: VersusSnapshot) => void) | null = null;
  private lastStateUpdate = 0;
  private static readonly STATE_THROTTLE_MS = 100;

  private matchResult: 'playing' | 'win' | 'lose' = 'playing';
  private matchEndReason: MatchEndReason | null = null;
  private playerKOs = 0;
  private aiKOs = 0;
  private remainingMs = MATCH_DURATION_MS;
  private unsubscribers: (() => void)[] = [];
  private playerLocked = false;
  private aiLocked = false;
  private handlingSideGameOver = false;
  private destroyed = false;

  constructor(
    playerCanvas: HTMLCanvasElement,
    aiCanvas: HTMLCanvasElement,
    aiLevel: number,
    gravityLevel: number,
  ) {
    // Create event buses
    this.playerEventBus = new EventBus();
    this.aiEventBus = new EventBus();

    // Create engines
    this.playerEngine = new GameEngine(this.playerEventBus, {
      mode: GameMode.VERSUS,
      startLevel: gravityLevel,
    });
    this.aiEngine = new GameEngine(this.aiEventBus, {
      mode: GameMode.VERSUS,
      startLevel: gravityLevel,
    });

    // Create renderers
    this.playerRenderer = new GameRenderer(playerCanvas, this.playerEventBus);
    this.aiRenderer = new GameRenderer(aiCanvas, this.aiEventBus);

    // Garbage manager
    this.garbageManager = new GarbageManager();

    // AI controller
    this.aiController = new AIController(aiLevel, (action: GameAction) => {
      this.aiEngine.applyAction(action);
    });

    // Input for player
    this.inputMapper = new InputMapper();
    this.dasManager = new DASManager();
    this.keyboardManager = new KeyboardManager(
      this.inputMapper,
      this.dasManager,
      (action: GameAction) => {
        if (action === GameAction.PAUSE) {
          this.togglePause();
          return;
        }
        this.playerEngine.applyAction(action);
      },
    );

    // Listen for attack events — three-step flow:
    // 1. Cancel pending garbage queued against attacker
    // 2. Remove physical garbage rows from attacker's board
    // 3. Send excess as pending to opponent
    this.unsubscribers.push(
      this.playerEventBus.on(GameEventType.ATTACK_SENT, ({ lines }) => {
        let remaining = lines;
        remaining -= this.garbageManager.cancelPending(0, remaining);
        if (remaining > 0) {
          remaining -= this.playerEngine.removeGarbageRows(remaining);
        }
        if (remaining > 0) {
          this.garbageManager.addPending(1, remaining);
        }
      }),
    );

    this.unsubscribers.push(
      this.aiEventBus.on(GameEventType.ATTACK_SENT, ({ lines }) => {
        let remaining = lines;
        remaining -= this.garbageManager.cancelPending(1, remaining);
        if (remaining > 0) {
          remaining -= this.aiEngine.removeGarbageRows(remaining);
        }
        if (remaining > 0) {
          this.garbageManager.addPending(0, remaining);
        }
      }),
    );

    // Track piece locks for deferred garbage materialization
    this.unsubscribers.push(
      this.playerEventBus.on(GameEventType.PIECE_LOCKED, () => {
        this.playerLocked = true;
      }),
    );
    this.unsubscribers.push(
      this.aiEventBus.on(GameEventType.PIECE_LOCKED, () => {
        this.aiLocked = true;
      }),
    );

    // Listen for game over — KO system
    this.unsubscribers.push(
      this.playerEventBus.on(GameEventType.GAME_OVER, () => {
        this.handleSideGameOver('player');
      }),
    );

    this.unsubscribers.push(
      this.aiEventBus.on(GameEventType.GAME_OVER, () => {
        this.handleSideGameOver('ai');
      }),
    );

    // Create game loop
    this.versusLoop = new VersusLoop(
      (deltaMs: number) => {
        // Process player DAS
        const dasActions = this.dasManager.update(deltaMs);
        for (const action of dasActions) {
          this.playerEngine.applyAction(action);
        }

        // Tick both engines
        this.playerEngine.tick(deltaMs);
        this.aiEngine.tick(deltaMs);

        // Deferred garbage materialization — only after a piece locks
        if (this.matchResult === 'playing' && this.playerLocked) {
          const pending = this.garbageManager.consumePending(0);
          if (pending > 0) this.playerEngine.receiveGarbage(pending);
          this.playerLocked = false;
        }
        if (this.matchResult === 'playing' && this.aiLocked) {
          const pending = this.garbageManager.consumePending(1);
          if (pending > 0) this.aiEngine.receiveGarbage(pending);
          this.aiLocked = false;
        }

        // Stop processing if match ended mid-tick (e.g. from garbage topout/KO)
        if (this.matchResult !== 'playing') return;

        // Update AI
        this.aiController.update(deltaMs, this.aiEngine.getSnapshot());

        // Match timer
        this.remainingMs -= deltaMs;
        if (this.remainingMs <= 0 && this.matchResult === 'playing') {
          this.remainingMs = 0;
          this.handleTimeout();
          return;
        }

        // Throttled state push
        this.lastStateUpdate += deltaMs;
        if (this.lastStateUpdate >= VersusSession.STATE_THROTTLE_MS) {
          this.lastStateUpdate = 0;
          this.pushState();
        }
      },
      (interpolation: number, deltaMs: number) => {
        this.playerRenderer.draw(
          this.playerEngine.getSnapshot(), interpolation, deltaMs,
          this.garbageManager.getPending(0),
        );
        this.aiRenderer.draw(
          this.aiEngine.getSnapshot(), interpolation, deltaMs,
          this.garbageManager.getPending(1),
        );
      },
    );

    // Initial resize
    this.playerRenderer.resize(playerCanvas.width, playerCanvas.height);
    this.aiRenderer.resize(aiCanvas.width, aiCanvas.height);
  }

  private endMatch(result: 'win' | 'lose', reason: MatchEndReason): void {
    this.matchResult = result;
    this.matchEndReason = reason;
    this.keyboardManager.detach();
    this.versusLoop.stop();
    this.pushState();
  }

  private handleSideGameOver(side: 'player' | 'ai'): void {
    if (this.matchResult !== 'playing') return;
    if (this.handlingSideGameOver) return;
    this.handlingSideGameOver = true;

    try {
      const engine = side === 'player' ? this.playerEngine : this.aiEngine;
      const hasGarbage = engine.hasGarbage();

      if (!hasGarbage) {
        // Topout without garbage = instant defeat
        this.endMatch(side === 'player' ? 'lose' : 'win', 'topout');
        return;
      }

      // Has garbage = knockout
      if (side === 'player') {
        this.playerKOs++;
        if (this.playerKOs >= KOS_TO_LOSE) {
          this.endMatch('lose', 'knockout');
          return;
        }
      } else {
        this.aiKOs++;
        if (this.aiKOs >= KOS_TO_LOSE) {
          this.endMatch('win', 'knockout');
          return;
        }
      }

      // KO but not defeated: reset and continue
      engine.resetForKO();
      if (side === 'ai') this.aiController.reset();
      const garbageSide = side === 'player' ? 0 : 1;
      this.garbageManager.consumePending(garbageSide as 0 | 1);
      if (side === 'player') this.playerLocked = false;
      else this.aiLocked = false;
    } finally {
      this.handlingSideGameOver = false;
    }
  }

  private handleTimeout(): void {
    // Fewer KOs wins; if tied, higher score wins
    let result: 'win' | 'lose';
    if (this.playerKOs < this.aiKOs) {
      result = 'win';
    } else if (this.aiKOs < this.playerKOs) {
      result = 'lose';
    } else {
      const playerScore = this.playerEngine.getSnapshot().score;
      const aiScore = this.aiEngine.getSnapshot().score;
      result = playerScore >= aiScore ? 'win' : 'lose';
    }
    this.endMatch(result, 'timeout');
  }

  private pushState(): void {
    this.stateCallback?.(this.getSnapshot());
  }

  onStateUpdate(callback: (snapshot: VersusSnapshot) => void): void {
    this.stateCallback = callback;
    callback(this.getSnapshot());
  }

  getPlayerEventBus(): EventBus {
    return this.playerEventBus;
  }

  getSnapshot(): VersusSnapshot {
    return {
      player: this.playerEngine.getSnapshot(),
      ai: this.aiEngine.getSnapshot(),
      playerPendingGarbage: this.garbageManager.getPending(0),
      aiPendingGarbage: this.garbageManager.getPending(1),
      playerKOs: this.playerKOs,
      aiKOs: this.aiKOs,
      remainingMs: this.remainingMs,
      matchResult: this.matchResult,
      matchEndReason: this.matchEndReason,
    };
  }

  async start(): Promise<void> {
    await this.aiController.init();
    if (this.destroyed) return;
    this.versusLoop.start();
    this.keyboardManager.attach();
  }

  pause(): void {
    const pSnap = this.playerEngine.getSnapshot();
    if (pSnap.isPaused || this.matchResult !== 'playing') return;

    this.playerEngine.applyAction(GameAction.PAUSE);
    this.aiEngine.applyAction(GameAction.PAUSE);
    this.versusLoop.stop();
    this.dasManager.releaseAll();
    this.pushState();
  }

  resume(): void {
    const pSnap = this.playerEngine.getSnapshot();
    if (!pSnap.isPaused || this.matchResult !== 'playing') return;

    this.playerEngine.applyAction(GameAction.PAUSE);
    this.aiEngine.applyAction(GameAction.PAUSE);
    this.versusLoop.start();
    this.pushState();
  }

  resizePlayer(width: number, height: number): void {
    this.playerRenderer.resize(width, height);
  }

  resizeAI(width: number, height: number): void {
    this.aiRenderer.resize(width, height);
  }

  destroy(): void {
    this.destroyed = true;
    this.stateCallback = null;
    this.versusLoop.stop();
    this.keyboardManager.detach();
    this.playerRenderer.destroy();
    this.aiRenderer.destroy();
    this.playerEventBus.removeAllListeners();
    this.aiEventBus.removeAllListeners();
    this.aiController.destroy();
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  private togglePause(): void {
    const pSnap = this.playerEngine.getSnapshot();
    if (this.matchResult !== 'playing') return;

    if (pSnap.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }
}
