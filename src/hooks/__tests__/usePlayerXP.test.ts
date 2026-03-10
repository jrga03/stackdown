import { describe, it, expect } from 'vitest';
import {
  xpForLevel,
  totalXpForLevel,
  levelFromTotalXP,
  getRankLabel,
} from '../usePlayerXP';

describe('xpForLevel', () => {
  it('returns floor(1000 * level^1.2) for each level', () => {
    expect(xpForLevel(1)).toBe(1000);
    expect(xpForLevel(2)).toBe(Math.floor(1000 * Math.pow(2, 1.2)));
    expect(xpForLevel(10)).toBe(Math.floor(1000 * Math.pow(10, 1.2)));
    expect(xpForLevel(99)).toBe(Math.floor(1000 * Math.pow(99, 1.2)));
  });
});

describe('totalXpForLevel', () => {
  it('returns 0 for level 1 (no XP needed to be level 1)', () => {
    expect(totalXpForLevel(1)).toBe(0);
  });

  it('returns xpForLevel(1) for level 2', () => {
    expect(totalXpForLevel(2)).toBe(xpForLevel(1));
  });

  it('returns sum of xpForLevel(1) + xpForLevel(2) for level 3', () => {
    expect(totalXpForLevel(3)).toBe(xpForLevel(1) + xpForLevel(2));
  });

  it('accumulates correctly for higher levels', () => {
    let expected = 0;
    for (let i = 1; i < 10; i++) {
      expected += xpForLevel(i);
    }
    expect(totalXpForLevel(10)).toBe(expected);
  });
});

describe('levelFromTotalXP', () => {
  it('returns 1 for 0 XP', () => {
    expect(levelFromTotalXP(0)).toBe(1);
  });

  it('returns 1 for XP just under level 2 threshold', () => {
    expect(levelFromTotalXP(999)).toBe(1);
  });

  it('returns 2 for exactly enough XP to reach level 2', () => {
    expect(levelFromTotalXP(xpForLevel(1))).toBe(2);
  });

  it('round-trips with totalXpForLevel', () => {
    for (const level of [1, 5, 10, 25, 50, 75, 100]) {
      const xp = totalXpForLevel(level);
      expect(levelFromTotalXP(xp)).toBe(level);
    }
  });

  it('returns level N for XP between level N and N+1 thresholds', () => {
    const xpAt10 = totalXpForLevel(10);
    const xpAt11 = totalXpForLevel(11);
    expect(levelFromTotalXP(xpAt10)).toBe(10);
    expect(levelFromTotalXP(xpAt10 + 1)).toBe(10);
    expect(levelFromTotalXP(xpAt11 - 1)).toBe(10);
    expect(levelFromTotalXP(xpAt11)).toBe(11);
  });

  it('caps at level 100 for very large XP', () => {
    expect(levelFromTotalXP(99999999)).toBe(100);
  });
});

describe('getRankLabel', () => {
  it('returns Beginner for levels 1–20', () => {
    expect(getRankLabel(1)).toBe('Beginner');
    expect(getRankLabel(20)).toBe('Beginner');
  });

  it('returns Intermediate for levels 21–40', () => {
    expect(getRankLabel(21)).toBe('Intermediate');
    expect(getRankLabel(40)).toBe('Intermediate');
  });

  it('returns Advanced for levels 41–60', () => {
    expect(getRankLabel(41)).toBe('Advanced');
    expect(getRankLabel(60)).toBe('Advanced');
  });

  it('returns Expert for levels 61–80', () => {
    expect(getRankLabel(61)).toBe('Expert');
    expect(getRankLabel(80)).toBe('Expert');
  });

  it('returns Master for levels 81–100', () => {
    expect(getRankLabel(81)).toBe('Master');
    expect(getRankLabel(100)).toBe('Master');
  });
});
