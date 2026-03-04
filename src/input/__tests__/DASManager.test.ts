import { describe, it, expect } from 'vitest';
import { DASManager } from '../DASManager';
import { GameAction, BOARD_WIDTH } from '../../engine';

describe('DASManager', () => {
  // 1. onKeyDown fires action immediately
  it('fires action immediately on keyDown', () => {
    const das = new DASManager();
    das.onKeyDown(GameAction.MOVE_LEFT);
    const actions = das.update(0);
    expect(actions).toContain(GameAction.MOVE_LEFT);
  });

  it('fires soft drop immediately on keyDown', () => {
    const das = new DASManager();
    das.onKeyDown(GameAction.SOFT_DROP);
    const actions = das.update(0);
    expect(actions).toContain(GameAction.SOFT_DROP);
  });

  // 2. DAS charges after 167ms, fires action
  it('fires action when DAS charges after dasDelayMs', () => {
    const das = new DASManager({ dasDelayMs: 167, arrIntervalMs: 33 });
    das.onKeyDown(GameAction.MOVE_LEFT);

    // Flush the immediate action
    das.update(0);

    // Advance time but not enough to charge DAS
    let actions = das.update(100);
    expect(actions).toEqual([]);

    // Advance past DAS threshold (100 + 67 = 167)
    actions = das.update(67);
    expect(actions).toContain(GameAction.MOVE_LEFT);
  });

  // 3. ARR fires every 33ms after DAS
  it('fires actions at ARR interval after DAS charges', () => {
    const das = new DASManager({ dasDelayMs: 167, arrIntervalMs: 33 });
    das.onKeyDown(GameAction.MOVE_RIGHT);

    // Flush immediate
    das.update(0);

    // Charge DAS exactly
    das.update(167);

    // Now ARR should fire every 33ms
    let actions = das.update(33);
    expect(actions).toContain(GameAction.MOVE_RIGHT);

    actions = das.update(33);
    expect(actions).toContain(GameAction.MOVE_RIGHT);
  });

  it('fires multiple ARR actions when delta covers multiple intervals', () => {
    const das = new DASManager({ dasDelayMs: 167, arrIntervalMs: 33 });
    das.onKeyDown(GameAction.MOVE_RIGHT);

    // Flush immediate
    das.update(0);

    // Charge DAS
    das.update(167);

    // 66ms = 2 ARR intervals
    const actions = das.update(66);
    expect(actions.filter(a => a === GameAction.MOVE_RIGHT).length).toBe(2);
  });

  // 4. Key release resets state
  it('stops producing actions after key release', () => {
    const das = new DASManager({ dasDelayMs: 167, arrIntervalMs: 33 });
    das.onKeyDown(GameAction.MOVE_LEFT);

    // Flush immediate
    das.update(0);

    // Partially charge DAS
    das.update(100);

    // Release key
    das.onKeyUp(GameAction.MOVE_LEFT);

    // Should produce no actions
    const actions = das.update(100);
    expect(actions).toEqual([]);
  });

  it('resets DAS accumulator on key release and re-press', () => {
    const das = new DASManager({ dasDelayMs: 167, arrIntervalMs: 33 });
    das.onKeyDown(GameAction.MOVE_LEFT);

    // Flush immediate
    das.update(0);

    // Partially charge (100ms of 167ms)
    das.update(100);

    // Release
    das.onKeyUp(GameAction.MOVE_LEFT);

    // Re-press
    das.onKeyDown(GameAction.MOVE_LEFT);

    // Flush new immediate
    const immediateActions = das.update(0);
    expect(immediateActions).toContain(GameAction.MOVE_LEFT);

    // Need full 167ms again to charge DAS, not just the remaining 67ms
    let actions = das.update(100);
    expect(actions).toEqual([]);

    actions = das.update(67);
    expect(actions).toContain(GameAction.MOVE_LEFT);
  });

  // 5. Direction priority: most recent direction wins
  it('prioritizes most recently pressed direction when both held', () => {
    const das = new DASManager({ dasDelayMs: 50, arrIntervalMs: 20 });

    // Press left first
    das.onKeyDown(GameAction.MOVE_LEFT);
    das.update(0); // flush immediate left

    // Press right (most recent)
    das.onKeyDown(GameAction.MOVE_RIGHT);
    const immediateActions = das.update(0); // flush immediate right
    expect(immediateActions).toContain(GameAction.MOVE_RIGHT);

    // Charge DAS for right (50ms)
    const dasActions = das.update(50);
    // Should only get MOVE_RIGHT (not MOVE_LEFT) since right was pressed most recently
    expect(dasActions).toContain(GameAction.MOVE_RIGHT);
    expect(dasActions).not.toContain(GameAction.MOVE_LEFT);
  });

  it('switches to remaining direction when most-recent is released', () => {
    const das = new DASManager({ dasDelayMs: 50, arrIntervalMs: 20 });

    // Press left, then right
    das.onKeyDown(GameAction.MOVE_LEFT);
    das.update(0);
    das.onKeyDown(GameAction.MOVE_RIGHT);
    das.update(0);

    // Release right; left is still held
    das.onKeyUp(GameAction.MOVE_RIGHT);

    // Left should now be the active direction
    // DAS for left is still charged from before? No -- left's DAS state continued independently
    // Actually, left was held but not being processed due to priority
    // After releasing right, left should continue from its current DAS state
    const actions = das.update(50);
    expect(actions).toContain(GameAction.MOVE_LEFT);
    expect(actions).not.toContain(GameAction.MOVE_RIGHT);
  });

  // 6. Soft drop independent from horizontal
  it('processes soft drop independently from horizontal movement', () => {
    const das = new DASManager({ dasDelayMs: 50, arrIntervalMs: 20, softDropArrMs: 20 });

    das.onKeyDown(GameAction.MOVE_RIGHT);
    das.onKeyDown(GameAction.SOFT_DROP);

    // Flush immediates
    const immediateActions = das.update(0);
    expect(immediateActions).toContain(GameAction.MOVE_RIGHT);
    expect(immediateActions).toContain(GameAction.SOFT_DROP);

    // Charge DAS for both
    const actions = das.update(50);
    expect(actions).toContain(GameAction.MOVE_RIGHT);
    expect(actions).toContain(GameAction.SOFT_DROP);
  });

  // 7. ARR=0: fires BOARD_WIDTH actions on DAS charge
  it('fires BOARD_WIDTH actions when ARR is 0 and DAS charges', () => {
    const das = new DASManager({ dasDelayMs: 100, arrIntervalMs: 0 });
    das.onKeyDown(GameAction.MOVE_LEFT);

    // Flush immediate
    das.update(0);

    // Charge DAS
    const actions = das.update(100);
    const leftActions = actions.filter(a => a === GameAction.MOVE_LEFT);
    expect(leftActions.length).toBe(BOARD_WIDTH);
  });

  it('does not fire additional actions after ARR=0 burst', () => {
    const das = new DASManager({ dasDelayMs: 100, arrIntervalMs: 0 });
    das.onKeyDown(GameAction.MOVE_LEFT);

    // Flush immediate
    das.update(0);

    // Charge DAS (triggers burst)
    das.update(100);

    // No further actions should fire
    const actions = das.update(100);
    expect(actions).toEqual([]);
  });

  // 8. releaseAll clears all state
  it('releaseAll clears all held state', () => {
    const das = new DASManager();
    das.onKeyDown(GameAction.MOVE_LEFT);
    das.onKeyDown(GameAction.MOVE_RIGHT);
    das.onKeyDown(GameAction.SOFT_DROP);

    // Flush immediates
    das.update(0);

    das.releaseAll();

    // No actions should be generated
    const actions = das.update(200);
    expect(actions).toEqual([]);
  });

  // 9. update returns pending actions from onKeyDown
  it('update returns pending actions that were queued by onKeyDown', () => {
    const das = new DASManager();
    das.onKeyDown(GameAction.MOVE_LEFT);
    das.onKeyDown(GameAction.MOVE_RIGHT);

    const actions = das.update(0);
    expect(actions).toContain(GameAction.MOVE_LEFT);
    expect(actions).toContain(GameAction.MOVE_RIGHT);
  });

  it('pending actions are cleared after update drains them', () => {
    const das = new DASManager();
    das.onKeyDown(GameAction.MOVE_LEFT);

    // First update drains pending
    das.update(0);

    // No pending actions left (only DAS/ARR processing)
    const actions = das.update(0);
    expect(actions).toEqual([]);
  });

  // Edge cases
  it('ignores non-DAS actions in onKeyDown', () => {
    const das = new DASManager();
    das.onKeyDown(GameAction.HARD_DROP);
    const actions = das.update(0);
    expect(actions).toEqual([]);
  });

  it('ignores non-DAS actions in onKeyUp', () => {
    const das = new DASManager();
    // Should not throw
    das.onKeyUp(GameAction.ROTATE_CW);
    const actions = das.update(0);
    expect(actions).toEqual([]);
  });

  it('handles DAS overshoot correctly - leftover time goes to ARR', () => {
    const das = new DASManager({ dasDelayMs: 100, arrIntervalMs: 50 });
    das.onKeyDown(GameAction.MOVE_LEFT);

    // Flush immediate
    das.update(0);

    // 130ms: DAS charges at 100ms, 30ms leftover goes to ARR (not enough for 50ms ARR)
    const actions = das.update(130);
    // Should fire once for DAS charge, but not yet ARR (30ms < 50ms)
    const leftCount = actions.filter(a => a === GameAction.MOVE_LEFT).length;
    expect(leftCount).toBe(1);

    // 20ms more: total ARR accum = 30 + 20 = 50ms, should fire once
    const actions2 = das.update(20);
    expect(actions2.filter(a => a === GameAction.MOVE_LEFT).length).toBe(1);
  });
});
