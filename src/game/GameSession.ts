import {
  GameEngine,
  EventBus,
  GameAction,
  GameMode,
  type GameSnapshot,
  type GameConfig,
} from '../engine';
import { GameRenderer } from '../renderer';
import { InputMapper, DASManager, KeyboardManager } from '../input';
import { GameLoop } from './GameLoop';

/**
 * Integrates engine, renderer, input, and game loop into a playable session.
 *
 * Tick order: DAS actions -> engine.tick() -> renderer.draw().
 * State updates to React are throttled to ~10fps (100ms).
 */
export class GameSession {
  private engine: GameEngine;
  private renderer: GameRenderer;
  private inputMapper: InputMapper;
  private dasManager: DASManager;
  private keyboardManager: KeyboardManager;
  private gameLoop: GameLoop;
  private eventBus: EventBus;
  private canvas: HTMLCanvasElement;

  private stateCallback: ((snapshot: GameSnapshot) => void) | null = null;
  private lastStateUpdate = 0;
  private static readonly STATE_THROTTLE_MS = 100; // ~10fps to React

  constructor(canvas: HTMLCanvasElement, config?: GameConfig) {
    this.canvas = canvas;
    this.eventBus = new EventBus();

    const mode = config?.mode ?? GameMode.MARATHON;
    const startLevel = config?.startLevel ?? 1;

    this.engine = new GameEngine(this.eventBus, { mode, startLevel });
    this.renderer = new GameRenderer(canvas, this.eventBus);
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
        this.engine.applyAction(action);
      },
    );

    this.gameLoop = new GameLoop(
      (deltaMs: number) => {
        // 1. Process DAS auto-repeat actions
        const dasActions = this.dasManager.update(deltaMs);
        for (const action of dasActions) {
          this.engine.applyAction(action);
        }

        // 2. Advance engine
        this.engine.tick(deltaMs);

        // 3. Throttled state push to React
        this.lastStateUpdate += deltaMs;
        if (this.lastStateUpdate >= GameSession.STATE_THROTTLE_MS) {
          this.lastStateUpdate = 0;
          this.stateCallback?.(this.engine.getSnapshot());
        }
      },
      (interpolation: number, deltaMs: number) => {
        this.renderer.draw(this.engine.getSnapshot(), interpolation, deltaMs);
      },
    );

    // Initial resize
    this.renderer.resize(canvas.width, canvas.height);
  }

  /**
   * Registers a callback that receives GameSnapshot updates at ~10fps.
   * Fires immediately with the current state.
   */
  onStateUpdate(callback: (snapshot: GameSnapshot) => void): void {
    this.stateCallback = callback;
    // Fire immediately so React has state before the first tick
    callback(this.engine.getSnapshot());
  }

  /**
   * Starts the game loop and attaches keyboard listeners.
   */
  start(): void {
    this.gameLoop.start();
    this.keyboardManager.attach();
  }

  /**
   * Pauses the game. No-op if already paused.
   * Stops the game loop but keeps keyboard attached so the user
   * can press Escape to unpause.
   */
  pause(): void {
    const snapshot = this.engine.getSnapshot();
    if (snapshot.isPaused || snapshot.isGameOver) return;

    this.engine.applyAction(GameAction.PAUSE);
    this.gameLoop.stop();
    this.dasManager.releaseAll();
    this.stateCallback?.(this.engine.getSnapshot());
  }

  /**
   * Resumes from pause. No-op if not paused.
   */
  resume(): void {
    const snapshot = this.engine.getSnapshot();
    if (!snapshot.isPaused || snapshot.isGameOver) return;

    this.engine.applyAction(GameAction.PAUSE);
    this.gameLoop.start();
    this.stateCallback?.(this.engine.getSnapshot());
  }

  /**
   * Restarts the game with a fresh engine. Optionally accepts new config.
   */
  restart(config?: GameConfig): void {
    // Stop everything
    this.gameLoop.stop();
    this.keyboardManager.detach();
    this.renderer.destroy();
    this.eventBus.removeAllListeners();

    // Recreate with fresh state
    const mode = config?.mode ?? GameMode.MARATHON;
    const startLevel = config?.startLevel ?? 1;

    this.eventBus = new EventBus();
    this.engine = new GameEngine(this.eventBus, { mode, startLevel });
    this.renderer = new GameRenderer(this.canvas, this.eventBus);
    this.lastStateUpdate = 0;

    // Re-wire keyboard callback to new engine
    this.keyboardManager = new KeyboardManager(
      this.inputMapper,
      this.dasManager,
      (action: GameAction) => {
        if (action === GameAction.PAUSE) {
          this.togglePause();
          return;
        }
        this.engine.applyAction(action);
      },
    );

    // Update game loop callbacks to reference new engine/renderer
    this.gameLoop = new GameLoop(
      (deltaMs: number) => {
        const dasActions = this.dasManager.update(deltaMs);
        for (const action of dasActions) {
          this.engine.applyAction(action);
        }
        this.engine.tick(deltaMs);

        this.lastStateUpdate += deltaMs;
        if (this.lastStateUpdate >= GameSession.STATE_THROTTLE_MS) {
          this.lastStateUpdate = 0;
          this.stateCallback?.(this.engine.getSnapshot());
        }
      },
      (interpolation: number, deltaMs: number) => {
        this.renderer.draw(this.engine.getSnapshot(), interpolation, deltaMs);
      },
    );

    // Resize renderer for current canvas dimensions
    this.renderer.resize(this.canvas.width, this.canvas.height);

    // Fire initial state and start
    this.stateCallback?.(this.engine.getSnapshot());
    this.start();
  }

  /**
   * Returns the current game snapshot.
   */
  getSnapshot(): GameSnapshot {
    return this.engine.getSnapshot();
  }

  /**
   * Updates the renderer for new canvas dimensions.
   */
  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  /**
   * Stops game loop, detaches input, cleans up renderer and events.
   */
  destroy(): void {
    this.gameLoop.stop();
    this.keyboardManager.detach();
    this.renderer.destroy();
    this.eventBus.removeAllListeners();
  }

  /**
   * Toggles pause state. Keeps keyboard attached so the user can
   * press Escape to unpause. Clears DAS state on pause.
   */
  private togglePause(): void {
    const snapshot = this.engine.getSnapshot();
    if (snapshot.isGameOver) return;

    if (snapshot.isPaused) {
      // Unpause
      this.engine.applyAction(GameAction.PAUSE);
      this.gameLoop.start();
    } else {
      // Pause
      this.engine.applyAction(GameAction.PAUSE);
      this.gameLoop.stop();
      this.dasManager.releaseAll();
    }

    this.stateCallback?.(this.engine.getSnapshot());
  }
}
