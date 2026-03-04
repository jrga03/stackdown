import { describe, it, expect } from 'vitest';
import { LockDelay } from '../LockDelay';
import { LOCK_DELAY_MS, MAX_LOCK_RESETS } from '../constants';

describe('LockDelay', () => {
  it('is not active initially', () => {
    const ld = new LockDelay();
    expect(ld.isActive()).toBe(false);
  });

  it('start() activates the timer', () => {
    const ld = new LockDelay();
    ld.start();
    expect(ld.isActive()).toBe(true);
  });

  it('isActive() returns true after start()', () => {
    const ld = new LockDelay();
    ld.start();
    expect(ld.isActive()).toBe(true);
  });

  it('tick(500) returns true — piece should lock', () => {
    const ld = new LockDelay();
    ld.start();
    const shouldLock = ld.tick(LOCK_DELAY_MS);
    expect(shouldLock).toBe(true);
  });

  it('tick(250) returns false, then tick(250) returns true', () => {
    const ld = new LockDelay();
    ld.start();
    expect(ld.tick(250)).toBe(false);
    expect(ld.tick(250)).toBe(true);
  });

  it('reset() resets timer — need another full 500ms after reset', () => {
    const ld = new LockDelay();
    ld.start();
    ld.tick(250); // 250ms elapsed, 250ms remaining
    ld.reset();
    // After reset, timer should be back to full LOCK_DELAY_MS
    expect(ld.tick(250)).toBe(false); // 250ms of 500ms
    expect(ld.tick(249)).toBe(false); // 499ms of 500ms
    expect(ld.tick(1)).toBe(true); // 500ms reached
  });

  it('reset() returns true when resets remain', () => {
    const ld = new LockDelay();
    ld.start();
    expect(ld.reset()).toBe(true);
  });

  it('after 15 resets, reset() returns false', () => {
    const ld = new LockDelay();
    ld.start();
    for (let i = 0; i < MAX_LOCK_RESETS; i++) {
      expect(ld.reset()).toBe(true);
    }
    expect(ld.reset()).toBe(false);
  });

  it('deactivate() sets active to false', () => {
    const ld = new LockDelay();
    ld.start();
    expect(ld.isActive()).toBe(true);
    ld.deactivate();
    expect(ld.isActive()).toBe(false);
  });

  it('after deactivate, tick returns false', () => {
    const ld = new LockDelay();
    ld.start();
    ld.tick(250);
    ld.deactivate();
    expect(ld.tick(500)).toBe(false);
  });

  it('after deactivate + start, all resets are restored (fresh 15)', () => {
    const ld = new LockDelay();
    ld.start();
    // Use up some resets
    for (let i = 0; i < 10; i++) {
      ld.reset();
    }
    ld.deactivate();
    ld.start();
    // Should have all 15 resets again
    for (let i = 0; i < MAX_LOCK_RESETS; i++) {
      expect(ld.reset()).toBe(true);
    }
    expect(ld.reset()).toBe(false);
  });

  it('tick when not active returns false', () => {
    const ld = new LockDelay();
    expect(ld.tick(500)).toBe(false);
  });
});
