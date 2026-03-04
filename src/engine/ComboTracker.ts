/**
 * Tracks combo counter for consecutive line clears.
 *
 * - Starts at -1 (no active combo).
 * - Each consecutive piece that clears at least one line increments by 1.
 * - A piece that locks without clearing resets the counter to -1.
 */
export class ComboTracker {
  private combo: number;

  constructor() {
    this.combo = -1;
  }

  /** Call when a piece clears one or more lines. Increments combo by 1. */
  onLineClear(): void {
    this.combo += 1;
  }

  /** Call when a piece locks without clearing any lines. Resets combo to -1. */
  onPieceLocked(): void {
    this.combo = -1;
  }

  /** Returns the current combo count. -1 means no active combo. */
  getCombo(): number {
    return this.combo;
  }
}
