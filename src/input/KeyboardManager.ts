import { GameAction } from '../engine';
import { InputMapper } from './InputMapper';
import { DASManager } from './DASManager';

/**
 * Set of actions that fire once immediately on key press
 * and are never auto-repeated through DAS/ARR.
 */
const IMMEDIATE_ACTIONS = new Set<GameAction>([
  GameAction.HARD_DROP,
  GameAction.ROTATE_CW,
  GameAction.ROTATE_CCW,
  GameAction.ROTATE_180,
  GameAction.HOLD,
  GameAction.PAUSE,
]);

/**
 * Manages keyboard event listeners on `window` and coordinates
 * between InputMapper (key-to-action mapping) and DASManager
 * (auto-repeat for movement actions).
 *
 * Immediate actions (hard drop, rotations, hold, pause) fire
 * the callback directly. DAS-processed actions (left, right,
 * soft drop) go through the DASManager.
 */
export class KeyboardManager {
  private inputMapper: InputMapper;
  private dasManager: DASManager;
  private actionCallback: (action: GameAction) => void;

  constructor(
    inputMapper: InputMapper,
    dasManager: DASManager,
    actionCallback: (action: GameAction) => void,
  ) {
    this.inputMapper = inputMapper;
    this.dasManager = dasManager;
    this.actionCallback = actionCallback;
  }

  /**
   * Attaches keydown, keyup, and blur listeners to window.
   */
  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /**
   * Removes all listeners and releases all DAS state.
   * Prevents stuck keys when pausing, ending, or unmounting.
   */
  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.dasManager.releaseAll();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Reject OS key repeat; the game implements its own DAS/ARR
    if (e.repeat) return;

    const action = this.inputMapper.mapKey(e.code);
    if (action === null) return;

    e.preventDefault();

    if (IMMEDIATE_ACTIONS.has(action)) {
      this.actionCallback(action);
    } else {
      this.dasManager.onKeyDown(action);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const action = this.inputMapper.mapKey(e.code);
    if (action === null) return;

    this.dasManager.onKeyUp(action);
  };

  private onBlur = (): void => {
    this.dasManager.releaseAll();
  };
}
