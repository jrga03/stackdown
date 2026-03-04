import { describe, it, expect } from 'vitest';
import { InputMapper } from '../InputMapper';
import { GameAction } from '../../engine';
import { DEFAULT_KEY_BINDINGS, type KeyBindings } from '../types';

describe('InputMapper', () => {
  // 1. Default bindings map correctly
  it('maps ArrowLeft to MOVE_LEFT with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('ArrowLeft')).toBe(GameAction.MOVE_LEFT);
  });

  it('maps ArrowRight to MOVE_RIGHT with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('ArrowRight')).toBe(GameAction.MOVE_RIGHT);
  });

  it('maps ArrowDown to SOFT_DROP with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('ArrowDown')).toBe(GameAction.SOFT_DROP);
  });

  it('maps Space to HARD_DROP with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('Space')).toBe(GameAction.HARD_DROP);
  });

  it('maps ArrowUp to ROTATE_CW with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('ArrowUp')).toBe(GameAction.ROTATE_CW);
  });

  it('maps KeyZ to ROTATE_CCW with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('KeyZ')).toBe(GameAction.ROTATE_CCW);
  });

  it('maps KeyA to ROTATE_180 with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('KeyA')).toBe(GameAction.ROTATE_180);
  });

  it('maps ShiftLeft to HOLD with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('ShiftLeft')).toBe(GameAction.HOLD);
  });

  it('maps Escape to PAUSE with default bindings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('Escape')).toBe(GameAction.PAUSE);
  });

  // 2. KeyC also maps to HOLD (secondary binding)
  it('maps KeyC to HOLD as a secondary binding', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('KeyC')).toBe(GameAction.HOLD);
  });

  // 3. Unmapped key returns null
  it('returns null for unmapped key', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('KeyX')).toBeNull();
  });

  it('returns null for empty string', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('')).toBeNull();
  });

  // 4. updateBindings changes mapping
  it('updateBindings changes key mappings', () => {
    const mapper = new InputMapper();
    expect(mapper.mapKey('ArrowLeft')).toBe(GameAction.MOVE_LEFT);

    const newBindings: KeyBindings = {
      ...DEFAULT_KEY_BINDINGS,
      moveLeft: 'KeyJ',
    };
    mapper.updateBindings(newBindings);

    expect(mapper.mapKey('KeyJ')).toBe(GameAction.MOVE_LEFT);
    // Old binding should no longer work
    expect(mapper.mapKey('ArrowLeft')).toBeNull();
  });

  it('updateBindings preserves extra bindings like KeyC for HOLD', () => {
    const mapper = new InputMapper();
    mapper.updateBindings({ ...DEFAULT_KEY_BINDINGS });
    expect(mapper.mapKey('KeyC')).toBe(GameAction.HOLD);
  });

  // 5. Custom bindings in constructor
  it('accepts custom bindings in constructor', () => {
    const customBindings: KeyBindings = {
      ...DEFAULT_KEY_BINDINGS,
      moveLeft: 'KeyH',
      moveRight: 'KeyL',
    };
    const mapper = new InputMapper(customBindings);

    expect(mapper.mapKey('KeyH')).toBe(GameAction.MOVE_LEFT);
    expect(mapper.mapKey('KeyL')).toBe(GameAction.MOVE_RIGHT);
    expect(mapper.mapKey('ArrowLeft')).toBeNull();
    expect(mapper.mapKey('ArrowRight')).toBeNull();
  });
});
