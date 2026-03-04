import { GameAction } from '../engine';

export interface KeyBindings {
  moveLeft: string;     // default: 'ArrowLeft'
  moveRight: string;    // default: 'ArrowRight'
  softDrop: string;     // default: 'ArrowDown'
  hardDrop: string;     // default: 'Space'
  rotateCW: string;     // default: 'ArrowUp'
  rotateCCW: string;    // default: 'KeyZ'
  rotate180: string;    // default: 'KeyA'
  hold: string;         // default: 'ShiftLeft'
  pause: string;        // default: 'Escape'
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotateCW: 'ArrowUp',
  rotateCCW: 'KeyZ',
  rotate180: 'KeyA',
  hold: 'ShiftLeft',
  pause: 'Escape',
};

/**
 * Additional key bindings that map to existing actions.
 * These are secondary bindings (e.g., KeyC also maps to HOLD).
 */
export const EXTRA_BINDINGS: ReadonlyArray<readonly [string, GameAction]> = [
  ['KeyC', GameAction.HOLD],
];
