import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../EventBus';
import { GameEventType, PieceType } from '../types';

describe('EventBus', () => {
  it('on() subscribes to event and emit() calls callback with payload', () => {
    const bus = new EventBus();
    const callback = vi.fn();

    bus.on(GameEventType.PIECE_SPAWNED, callback);
    bus.emit(GameEventType.PIECE_SPAWNED, { type: PieceType.T });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ type: PieceType.T });
  });

  it('multiple listeners for same event all receive payload', () => {
    const bus = new EventBus();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const cb3 = vi.fn();

    bus.on(GameEventType.LEVEL_UP, cb1);
    bus.on(GameEventType.LEVEL_UP, cb2);
    bus.on(GameEventType.LEVEL_UP, cb3);

    bus.emit(GameEventType.LEVEL_UP, { newLevel: 5 });

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb1).toHaveBeenCalledWith({ newLevel: 5 });
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledWith({ newLevel: 5 });
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledWith({ newLevel: 5 });
  });

  it('calling unsubscribe function removes the callback', () => {
    const bus = new EventBus();
    const callback = vi.fn();

    const unsubscribe = bus.on(GameEventType.PIECE_MOVED, callback);
    bus.emit(GameEventType.PIECE_MOVED, { direction: 'left' });
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    bus.emit(GameEventType.PIECE_MOVED, { direction: 'right' });
    expect(callback).toHaveBeenCalledTimes(1); // still 1, not called again
  });

  it('removeAllListeners() clears all subscriptions', () => {
    const bus = new EventBus();
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    bus.on(GameEventType.PIECE_SPAWNED, cb1);
    bus.on(GameEventType.LEVEL_UP, cb2);

    bus.removeAllListeners();

    bus.emit(GameEventType.PIECE_SPAWNED, { type: PieceType.I });
    bus.emit(GameEventType.LEVEL_UP, { newLevel: 2 });

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it('emitting with no listeners does not throw', () => {
    const bus = new EventBus();

    expect(() => {
      bus.emit(GameEventType.GAME_OVER, {
        finalScore: 1000,
        linesCleared: 10,
        reason: 'topout',
      });
    }).not.toThrow();
  });

  it('unsubscribing twice does not throw', () => {
    const bus = new EventBus();
    const callback = vi.fn();

    const unsubscribe = bus.on(GameEventType.COMBO, callback);
    unsubscribe();

    expect(() => {
      unsubscribe();
    }).not.toThrow();
  });

  it('listeners for different events do not interfere', () => {
    const bus = new EventBus();
    const spawnCb = vi.fn();
    const levelCb = vi.fn();

    bus.on(GameEventType.PIECE_SPAWNED, spawnCb);
    bus.on(GameEventType.LEVEL_UP, levelCb);

    bus.emit(GameEventType.PIECE_SPAWNED, { type: PieceType.S });

    expect(spawnCb).toHaveBeenCalledTimes(1);
    expect(spawnCb).toHaveBeenCalledWith({ type: PieceType.S });
    expect(levelCb).not.toHaveBeenCalled();

    bus.emit(GameEventType.LEVEL_UP, { newLevel: 3 });

    expect(levelCb).toHaveBeenCalledTimes(1);
    expect(levelCb).toHaveBeenCalledWith({ newLevel: 3 });
    expect(spawnCb).toHaveBeenCalledTimes(1); // still 1
  });
});
