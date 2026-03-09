import { describe, it, expect } from 'vitest';
import { GarbageManager } from '../GarbageManager';

describe('GarbageManager', () => {
  it('consumePending returns and clears pending', () => {
    const gm = new GarbageManager();
    gm.addPending(1, 3);
    expect(gm.getPending(1)).toBe(3);

    const consumed = gm.consumePending(1);
    expect(consumed).toBe(3);
    expect(gm.getPending(1)).toBe(0);
  });

  it('consumePending returns 0 when nothing pending', () => {
    const gm = new GarbageManager();
    expect(gm.consumePending(0)).toBe(0);
  });

  it('reset clears all pending', () => {
    const gm = new GarbageManager();
    gm.addPending(0, 3);
    gm.addPending(1, 2);
    gm.reset();
    expect(gm.getPending(0)).toBe(0);
    expect(gm.getPending(1)).toBe(0);
  });

  describe('cancelPending', () => {
    it('cancels up to the pending amount', () => {
      const gm = new GarbageManager();
      gm.addPending(0, 5);
      const cancelled = gm.cancelPending(0, 3);
      expect(cancelled).toBe(3);
      expect(gm.getPending(0)).toBe(2);
    });

    it('cancels only what is available', () => {
      const gm = new GarbageManager();
      gm.addPending(0, 2);
      const cancelled = gm.cancelPending(0, 5);
      expect(cancelled).toBe(2);
      expect(gm.getPending(0)).toBe(0);
    });

    it('returns 0 when no pending garbage', () => {
      const gm = new GarbageManager();
      expect(gm.cancelPending(0, 3)).toBe(0);
    });

    it('returns 0 for zero or negative lines', () => {
      const gm = new GarbageManager();
      gm.addPending(0, 5);
      expect(gm.cancelPending(0, 0)).toBe(0);
      expect(gm.cancelPending(0, -1)).toBe(0);
      expect(gm.getPending(0)).toBe(5);
    });
  });

  describe('addPending', () => {
    it('adds pending garbage to a side', () => {
      const gm = new GarbageManager();
      gm.addPending(1, 3);
      expect(gm.getPending(1)).toBe(3);
      gm.addPending(1, 2);
      expect(gm.getPending(1)).toBe(5);
    });

    it('does nothing for zero or negative lines', () => {
      const gm = new GarbageManager();
      gm.addPending(0, 0);
      gm.addPending(0, -1);
      expect(gm.getPending(0)).toBe(0);
    });
  });
});
