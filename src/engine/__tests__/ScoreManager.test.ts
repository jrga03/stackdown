import { describe, it, expect } from 'vitest';
import { ScoreManager } from '../ScoreManager';

describe('ScoreManager', () => {
  // 1. Single at level 1 = 100
  it('awards 100 points for a single at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processLineClear(1, false, false, 0);
    expect(points).toBe(100);
    expect(sm.getScore()).toBe(100);
  });

  // 2. Double at level 1 = 300
  it('awards 300 points for a double at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processLineClear(2, false, false, 0);
    expect(points).toBe(300);
    expect(sm.getScore()).toBe(300);
  });

  // 3. Triple at level 1 = 500
  it('awards 500 points for a triple at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processLineClear(3, false, false, 0);
    expect(points).toBe(500);
    expect(sm.getScore()).toBe(500);
  });

  // 4. Quad at level 1 = 800
  it('awards 800 points for a quad at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processLineClear(4, false, false, 0);
    expect(points).toBe(800);
    expect(sm.getScore()).toBe(800);
  });

  // 5. T-Spin Double at level 1 = 1200
  it('awards 1200 points for a T-Spin Double at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processLineClear(2, true, false, 0);
    expect(points).toBe(1200);
    expect(sm.getScore()).toBe(1200);
  });

  // 6. T-Spin Mini Single at level 1 = 200
  it('awards 200 points for a T-Spin Mini Single at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processLineClear(1, true, true, 0);
    expect(points).toBe(200);
    expect(sm.getScore()).toBe(200);
  });

  // 7. Points multiplied by level (Single at level 5 = 500)
  it('multiplies base points by level (single at level 5 = 500)', () => {
    const sm = new ScoreManager({ startLevel: 5 });
    const points = sm.processLineClear(1, false, false, 0);
    expect(points).toBe(500);
    expect(sm.getScore()).toBe(500);
  });

  // 8. B2B Quad: floor(800 * 1.5) = 1200 at level 1
  it('applies back-to-back multiplier for consecutive quads', () => {
    const sm = new ScoreManager();
    // First quad sets B2B flag (difficult clear)
    sm.processLineClear(4, false, false, 0);
    expect(sm.getBackToBack()).toBe(true);

    // Second quad gets B2B bonus
    const points = sm.processLineClear(4, false, false, 0);
    expect(points).toBe(Math.floor(800 * 1.5)); // 1200
    expect(sm.getScore()).toBe(800 + 1200); // 2000 total
  });

  // 9. B2B resets on non-difficult clear
  it('resets back-to-back on non-difficult clear', () => {
    const sm = new ScoreManager();
    // Quad sets B2B
    sm.processLineClear(4, false, false, 0);
    expect(sm.getBackToBack()).toBe(true);

    // Single (non-difficult) resets B2B
    sm.processLineClear(1, false, false, 0);
    expect(sm.getBackToBack()).toBe(false);
  });

  // 10. B2B does NOT reset on resetCombo (non-clearing lock)
  it('does not reset back-to-back on resetCombo', () => {
    const sm = new ScoreManager();
    // Quad sets B2B
    sm.processLineClear(4, false, false, 0);
    expect(sm.getBackToBack()).toBe(true);

    // Non-clearing piece lock: only resets combo, not B2B
    sm.resetCombo();
    expect(sm.getBackToBack()).toBe(true);
    expect(sm.getCombo()).toBe(-1);
  });

  // 11. Combo bonus: 50 x combo x level
  it('awards combo bonus of 50 x combo x level', () => {
    const sm = new ScoreManager();

    // First clear: combo goes from -1 to 0 (no combo bonus yet)
    const points1 = sm.processLineClear(1, false, false, 0);
    expect(points1).toBe(100); // 100 * 1, no combo bonus

    // Second consecutive clear: combo = 1, bonus = 50 * 1 * 1 = 50
    const points2 = sm.processLineClear(1, false, false, 1);
    expect(points2).toBe(150); // 100 + 50

    // Third consecutive clear: combo = 2, bonus = 50 * 2 * 1 = 100
    const points3 = sm.processLineClear(1, false, false, 2);
    expect(points3).toBe(200); // 100 + 100
  });

  // 12. Soft drop 10 cells = 10 pts (not x level)
  it('awards 1 point per cell for soft drop (not multiplied by level)', () => {
    const sm = new ScoreManager({ startLevel: 5 });
    sm.addDropPoints(10, false);
    expect(sm.getScore()).toBe(10); // 1 * 10, not multiplied by level
  });

  // 13. Hard drop 10 cells = 20 pts (not x level)
  it('awards 2 points per cell for hard drop (not multiplied by level)', () => {
    const sm = new ScoreManager({ startLevel: 5 });
    sm.addDropPoints(10, true);
    expect(sm.getScore()).toBe(20); // 2 * 10, not multiplied by level
  });

  // 14. Level up after 5 lines at level 1
  it('levels up after clearing required lines', () => {
    const sm = new ScoreManager();
    expect(sm.getLevel()).toBe(1);

    // Clear 4 lines - not enough yet
    sm.processLineClear(4, false, false, 0);
    expect(sm.checkLevelUp()).toBeNull();
    expect(sm.getLevel()).toBe(1);

    // Clear 1 more line - total 5, should level up
    sm.processLineClear(1, false, false, 0);
    const newLevel = sm.checkLevelUp();
    expect(newLevel).toBe(2);
    expect(sm.getLevel()).toBe(2);
  });

  // 15. fixedLevel: checkLevelUp always returns null
  it('checkLevelUp always returns null when fixedLevel is true', () => {
    const sm = new ScoreManager({ startLevel: 3, fixedLevel: true });
    expect(sm.getLevel()).toBe(3);

    // Clear enough lines to normally level up
    sm.processLineClear(4, false, false, 0);
    sm.processLineClear(4, false, false, 0);
    expect(sm.checkLevelUp()).toBeNull();
    expect(sm.getLevel()).toBe(3); // Level unchanged
  });

  // 16. T-Spin no lines = 400 at level 1
  it('awards 400 points for T-Spin with no lines at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processTSpinNoLines(false);
    expect(points).toBe(400);
    expect(sm.getScore()).toBe(400);
  });

  // 17. T-Spin Mini no lines = 100 at level 1
  it('awards 100 points for T-Spin Mini with no lines at level 1', () => {
    const sm = new ScoreManager();
    const points = sm.processTSpinNoLines(true);
    expect(points).toBe(100);
    expect(sm.getScore()).toBe(100);
  });

  // Additional: B2B applies to T-Spin clears (not mini)
  it('applies B2B to T-Spin clears but not T-Spin Mini clears', () => {
    const sm = new ScoreManager();
    // T-Spin Single is a difficult clear
    sm.processLineClear(1, true, false, 0);
    expect(sm.getBackToBack()).toBe(true);

    // T-Spin Mini Single is NOT a difficult clear - resets B2B
    sm.processLineClear(1, true, true, 0);
    expect(sm.getBackToBack()).toBe(false);
  });

  // Additional: Combo bonus at higher level
  it('scales combo bonus by level', () => {
    const sm = new ScoreManager({ startLevel: 3 });

    // First clear: combo 0, no combo bonus
    const points1 = sm.processLineClear(1, false, false, 0);
    expect(points1).toBe(300); // 100 * 3

    // Second clear: combo 1, bonus = 50 * 1 * 3 = 150
    const points2 = sm.processLineClear(1, false, false, 1);
    expect(points2).toBe(450); // (100 * 3) + (50 * 1 * 3)
  });
});
