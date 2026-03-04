import { GRAVITY_TABLE } from './constants';

export class GravityTimer {
  private accumulator: number;

  constructor() {
    this.accumulator = 0;
  }

  /**
   * Advance the gravity timer by deltaMs milliseconds.
   * Returns the number of cells the piece should drop.
   * Multiple drops can occur in a single tick at high levels.
   */
  tick(deltaMs: number, level: number): number {
    this.accumulator += deltaMs;
    const interval = this.getIntervalForLevel(level);

    let drops = 0;
    while (this.accumulator >= interval) {
      this.accumulator -= interval;
      drops++;
    }

    return drops;
  }

  /** Reset the accumulator to zero. */
  reset(): void {
    this.accumulator = 0;
  }

  /** Return the gravity interval in ms for the given level. Levels beyond 15 use level 15's interval. */
  getIntervalForLevel(level: number): number {
    if (level >= GRAVITY_TABLE.length) {
      return GRAVITY_TABLE[GRAVITY_TABLE.length - 1]!;
    }
    return GRAVITY_TABLE[level]!;
  }
}
