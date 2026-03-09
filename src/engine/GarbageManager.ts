/**
 * Manages garbage exchange between two players using a net-based cancel system.
 *
 * When a player generates attack lines, those lines first cancel any pending
 * garbage queued against them. Only excess lines are sent to the opponent.
 */
export class GarbageManager {
  /** Garbage lines pending against each side */
  private pendingGarbage: [number, number] = [0, 0];

  /**
   * Consume and return all pending garbage for a side,
   * resetting the counter to 0.
   */
  consumePending(side: 0 | 1): number {
    const pending = this.pendingGarbage[side];
    this.pendingGarbage[side] = 0;
    return pending;
  }

  /** Get current pending garbage for a side (read-only). */
  getPending(side: 0 | 1): number {
    return this.pendingGarbage[side];
  }

  /**
   * Cancel up to `lines` of pending garbage for a side.
   * Returns the amount actually cancelled.
   */
  cancelPending(side: 0 | 1, lines: number): number {
    if (lines <= 0) return 0;
    const pending = this.pendingGarbage[side];
    const cancelled = Math.min(pending, lines);
    this.pendingGarbage[side] -= cancelled;
    return cancelled;
  }

  /** Add `lines` of pending garbage to a side. */
  addPending(side: 0 | 1, lines: number): void {
    if (lines <= 0) return;
    this.pendingGarbage[side] += lines;
  }

  /** Reset all pending garbage. */
  reset(): void {
    this.pendingGarbage[0] = 0;
    this.pendingGarbage[1] = 0;
  }
}
