import { TICK_MS } from '../engine';

/**
 * Fixed-timestep game loop using requestAnimationFrame.
 *
 * Runs at ~60 ticks/sec (TICK_MS = 16.667ms). Each animation frame
 * accumulates real elapsed time and processes as many fixed-size ticks
 * as fit, then calls the render callback with an interpolation factor
 * (0.0-1.0) for smooth sub-tick rendering.
 *
 * Frame time is clamped to 250ms to prevent the "spiral of death"
 * when the browser tab is backgrounded or the system is under load.
 */
export class GameLoop {
  private rafId: number | null = null;
  private accumulator = 0;
  private lastTimestamp = 0;
  private running = false;
  private tickCallback: (deltaMs: number) => void;
  private renderCallback: (interpolation: number, deltaMs: number) => void;

  constructor(
    tickCallback: (deltaMs: number) => void,
    renderCallback: (interpolation: number, deltaMs: number) => void,
  ) {
    this.tickCallback = tickCallback;
    this.renderCallback = renderCallback;
  }

  /**
   * Start the game loop. If already running, this is a no-op.
   * Resets accumulator and lastTimestamp, then requests the first frame.
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  /**
   * Stop the game loop. Cancels the pending animation frame.
   */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Returns whether the loop is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * The core frame callback, called by requestAnimationFrame.
   *
   * On the first frame, lastTimestamp is initialized to the current
   * timestamp so the initial delta is 0 (no huge spike).
   */
  private frame = (timestamp: number): void => {
    if (!this.running) return;

    // First frame: seed lastTimestamp to avoid a large initial delta
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    let deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Clamp to 250ms to prevent spiral of death
    if (deltaMs > 250) {
      deltaMs = 250;
    }

    this.accumulator += deltaMs;

    // Process fixed-size ticks
    while (this.accumulator >= TICK_MS) {
      this.tickCallback(TICK_MS);
      this.accumulator -= TICK_MS;
    }

    // Interpolation factor for smooth rendering (0.0 to < 1.0)
    const interpolation = this.accumulator / TICK_MS;
    this.renderCallback(interpolation, deltaMs);

    this.rafId = requestAnimationFrame(this.frame);
  };
}
