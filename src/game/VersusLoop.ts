import { TICK_MS } from '../engine';

/**
 * Single rAF loop ticking both player and AI engines.
 * Same fixed-timestep pattern as GameLoop but with dual tick/render callbacks.
 */
export class VersusLoop {
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

  start(): void {
    if (this.running) return;
    this.running = true;
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private frame = (timestamp: number): void => {
    if (!this.running) return;

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    let deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    if (deltaMs > 250) {
      deltaMs = 250;
    }

    this.accumulator += deltaMs;

    while (this.running && this.accumulator >= TICK_MS) {
      this.tickCallback(TICK_MS);
      this.accumulator -= TICK_MS;
    }

    if (this.running) {
      const interpolation = this.accumulator / TICK_MS;
      this.renderCallback(interpolation, deltaMs);
      this.rafId = requestAnimationFrame(this.frame);
    }
  };
}
