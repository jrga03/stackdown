import { LOCK_DELAY_MS, MAX_LOCK_RESETS } from './constants';

export class LockDelay {
  private timer: number;
  private resetsRemaining: number;
  private active: boolean;

  constructor() {
    this.timer = LOCK_DELAY_MS;
    this.resetsRemaining = MAX_LOCK_RESETS;
    this.active = false;
  }

  /** Starts the lock delay timer at LOCK_DELAY_MS. */
  start(): void {
    this.timer = LOCK_DELAY_MS;
    this.active = true;
  }

  /**
   * Counts down the timer by deltaMs.
   * Returns true if the piece should lock (timer reached 0).
   */
  tick(deltaMs: number): boolean {
    if (!this.active) {
      return false;
    }

    this.timer -= deltaMs;

    if (this.timer <= 0) {
      this.active = false;
      return true;
    }

    return false;
  }

  /**
   * Resets the timer to LOCK_DELAY_MS if resets remain.
   * Returns true if the reset was applied, false if no resets remain.
   */
  reset(): boolean {
    if (this.resetsRemaining <= 0) {
      return false;
    }

    this.resetsRemaining--;
    this.timer = LOCK_DELAY_MS;
    return true;
  }

  /** Returns true only if the lock delay timer is actively counting down. */
  isActive(): boolean {
    return this.active;
  }

  /** Fully resets the lock delay state (piece moved off surface). */
  deactivate(): void {
    this.timer = LOCK_DELAY_MS;
    this.resetsRemaining = MAX_LOCK_RESETS;
    this.active = false;
  }
}
