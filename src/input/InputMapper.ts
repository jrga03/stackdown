import { GameAction } from '../engine';
import { type KeyBindings, DEFAULT_KEY_BINDINGS, EXTRA_BINDINGS } from './types';

/**
 * Maps KeyboardEvent.code values to GameAction values
 * using the configured key bindings.
 */
export class InputMapper {
  private bindings: Map<string, GameAction>;

  constructor(keyBindings?: KeyBindings) {
    this.bindings = new Map();
    this.buildBindings(keyBindings ?? DEFAULT_KEY_BINDINGS);
  }

  /**
   * Maps a KeyboardEvent.code to a GameAction.
   * Returns null if the key is not bound to any action.
   */
  mapKey(code: string): GameAction | null {
    return this.bindings.get(code) ?? null;
  }

  /**
   * Replaces all key bindings with new ones.
   * Also re-adds extra bindings (e.g., KeyC for HOLD).
   */
  updateBindings(keyBindings: KeyBindings): void {
    this.bindings.clear();
    this.buildBindings(keyBindings);
  }

  private buildBindings(keyBindings: KeyBindings): void {
    const actionMap: ReadonlyArray<readonly [keyof KeyBindings, GameAction]> = [
      ['moveLeft', GameAction.MOVE_LEFT],
      ['moveRight', GameAction.MOVE_RIGHT],
      ['softDrop', GameAction.SOFT_DROP],
      ['hardDrop', GameAction.HARD_DROP],
      ['rotateCW', GameAction.ROTATE_CW],
      ['rotateCCW', GameAction.ROTATE_CCW],
      ['rotate180', GameAction.ROTATE_180],
      ['hold', GameAction.HOLD],
      ['pause', GameAction.PAUSE],
    ];

    for (const [bindingKey, action] of actionMap) {
      this.bindings.set(keyBindings[bindingKey], action);
    }

    // Add extra bindings (e.g., KeyC -> HOLD)
    for (const [code, action] of EXTRA_BINDINGS) {
      this.bindings.set(code, action);
    }
  }
}
