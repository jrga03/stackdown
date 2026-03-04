import { describe, it, expect } from 'vitest';
import { ComboTracker } from '../ComboTracker';

describe('ComboTracker', () => {
  it('starts at -1', () => {
    const tracker = new ComboTracker();
    expect(tracker.getCombo()).toBe(-1);
  });

  it('after 1 line clear, combo = 0', () => {
    const tracker = new ComboTracker();
    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(0);
  });

  it('after 2 consecutive clears, combo = 1', () => {
    const tracker = new ComboTracker();
    tracker.onLineClear();
    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(1);
  });

  it('after 3 consecutive clears, combo = 2', () => {
    const tracker = new ComboTracker();
    tracker.onLineClear();
    tracker.onLineClear();
    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(2);
  });

  it('after a non-clearing lock, combo resets to -1', () => {
    const tracker = new ComboTracker();
    tracker.onLineClear();
    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(1);

    tracker.onPieceLocked();
    expect(tracker.getCombo()).toBe(-1);
  });

  it('after reset, next clear starts at 0 again', () => {
    const tracker = new ComboTracker();
    tracker.onLineClear();
    tracker.onLineClear();
    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(2);

    tracker.onPieceLocked();
    expect(tracker.getCombo()).toBe(-1);

    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(0);
  });

  it('getCombo returns current combo', () => {
    const tracker = new ComboTracker();
    expect(tracker.getCombo()).toBe(-1);

    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(0);

    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(1);

    tracker.onPieceLocked();
    expect(tracker.getCombo()).toBe(-1);

    tracker.onLineClear();
    expect(tracker.getCombo()).toBe(0);
  });
});
