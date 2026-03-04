import { describe, it, expect } from 'vitest';
import { GravityTimer } from '../GravityTimer';
import { GRAVITY_TABLE } from '../constants';

describe('GravityTimer', () => {
  // 1. getIntervalForLevel returns correct values for levels 1-15
  it('getIntervalForLevel returns correct values for levels 1-15', () => {
    const timer = new GravityTimer();

    for (let level = 1; level <= 15; level++) {
      expect(timer.getIntervalForLevel(level)).toBe(GRAVITY_TABLE[level]);
    }
  });

  // 2. At level 1 (1000ms), tick(1000) returns 1
  it('at level 1 (1000ms), tick(1000) returns 1', () => {
    const timer = new GravityTimer();
    const drops = timer.tick(1000, 1);
    expect(drops).toBe(1);
  });

  // 3. At level 1, tick(500) returns 0, then tick(500) returns 1
  it('at level 1, tick(500) returns 0 then tick(500) returns 1', () => {
    const timer = new GravityTimer();

    const firstDrops = timer.tick(500, 1);
    expect(firstDrops).toBe(0);

    const secondDrops = timer.tick(500, 1);
    expect(secondDrops).toBe(1);
  });

  // 4. At level 1, tick(2500) returns 2 (multiple drops)
  it('at level 1, tick(2500) returns 2 (multiple drops)', () => {
    const timer = new GravityTimer();
    const drops = timer.tick(2500, 1);
    expect(drops).toBe(2);
  });

  // 5. At level 15 (7ms), tick(100) returns multiple drops (14)
  it('at level 15 (7ms), tick(100) returns 14 drops', () => {
    const timer = new GravityTimer();
    const drops = timer.tick(100, 15);
    expect(drops).toBe(14);
  });

  // 6. reset() clears the accumulator
  it('reset() clears the accumulator', () => {
    const timer = new GravityTimer();

    // Accumulate 500ms (not enough for a drop at level 1)
    timer.tick(500, 1);

    timer.reset();

    // After reset, 500ms should not be enough again
    const drops = timer.tick(500, 1);
    expect(drops).toBe(0);
  });

  // 7. After reset, tick needs full interval again
  it('after reset, tick needs full interval again', () => {
    const timer = new GravityTimer();

    // Accumulate 900ms at level 1
    timer.tick(900, 1);
    timer.reset();

    // Need full 1000ms again, not just 100ms
    const drops100 = timer.tick(100, 1);
    expect(drops100).toBe(0);

    const drops900 = timer.tick(900, 1);
    expect(drops900).toBe(1);
  });

  // 8. Levels beyond 15 use level 15 interval (7ms)
  it('levels beyond 15 use level 15 interval', () => {
    const timer = new GravityTimer();

    expect(timer.getIntervalForLevel(16)).toBe(7);
    expect(timer.getIntervalForLevel(20)).toBe(7);
    expect(timer.getIntervalForLevel(100)).toBe(7);

    // Verify tick behavior matches level 15
    const drops = timer.tick(100, 20);
    expect(drops).toBe(14); // same as level 15: floor(100/7) = 14
  });
});
