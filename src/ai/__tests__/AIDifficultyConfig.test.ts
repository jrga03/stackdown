import { describe, it, expect } from 'vitest';
import { getDifficultyConfig } from '../AIDifficultyConfig';

describe('AIDifficultyConfig', () => {
  it('returns config for level 1', () => {
    const config = getDifficultyConfig(1);
    expect(config.thinkDelayMin).toBe(2000);
    expect(config.thinkDelayMax).toBe(2400);
    expect(config.actionInterval).toBe(260);
    expect(config.mistakeRate).toBeCloseTo(0.45);
    expect(config.useHold).toBe(false);
    expect(config.kickSearch).toBe(false);
    expect(config.twoPieceLookahead).toBe(false);
  });

  it('returns config for level 100', () => {
    const config = getDifficultyConfig(100);
    expect(config.thinkDelayMin).toBe(50);
    expect(config.thinkDelayMax).toBe(120);
    expect(config.actionInterval).toBe(30);
    expect(config.mistakeRate).toBeCloseTo(0.01);
    expect(config.useHold).toBe(true);
    expect(config.kickSearch).toBe(true);
    expect(config.twoPieceLookahead).toBe(true);
  });

  it('interpolates smoothly at level 50', () => {
    const config = getDifficultyConfig(50);
    // Between level 25 and 75 anchor points
    expect(config.thinkDelayMin).toBeGreaterThan(200);
    expect(config.thinkDelayMin).toBeLessThan(1000);
    expect(config.actionInterval).toBeGreaterThan(70);
    expect(config.actionInterval).toBeLessThan(170);
  });

  it('enables hold at level 40+', () => {
    expect(getDifficultyConfig(39).useHold).toBe(false);
    expect(getDifficultyConfig(40).useHold).toBe(true);
    expect(getDifficultyConfig(100).useHold).toBe(true);
  });

  it('enables kickSearch at level 60+', () => {
    expect(getDifficultyConfig(59).kickSearch).toBe(false);
    expect(getDifficultyConfig(60).kickSearch).toBe(true);
  });

  it('enables twoPieceLookahead at level 65+', () => {
    expect(getDifficultyConfig(64).twoPieceLookahead).toBe(false);
    expect(getDifficultyConfig(65).twoPieceLookahead).toBe(true);
  });

  it('clamps below 1 to level 1 config', () => {
    const below = getDifficultyConfig(0);
    const one = getDifficultyConfig(1);
    expect(below.thinkDelayMin).toBe(one.thinkDelayMin);
  });

  it('clamps above 100 to level 100 config', () => {
    const above = getDifficultyConfig(150);
    const hundred = getDifficultyConfig(100);
    expect(above.thinkDelayMin).toBe(hundred.thinkDelayMin);
  });

  it('difficulty increases monotonically (think delay decreases)', () => {
    let prevDelay = Infinity;
    for (let level = 1; level <= 100; level++) {
      const config = getDifficultyConfig(level);
      expect(config.thinkDelayMin).toBeLessThanOrEqual(prevDelay);
      prevDelay = config.thinkDelayMin;
    }
  });
});
