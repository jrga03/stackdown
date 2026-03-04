import { GameAction, BOARD_WIDTH } from '../engine';

export interface DASConfig {
  dasDelayMs: number;     // default: 167
  arrIntervalMs: number;  // default: 33
  softDropArrMs: number;  // default: 33
}

const DEFAULT_DAS_CONFIG: DASConfig = {
  dasDelayMs: 167,
  arrIntervalMs: 33,
  softDropArrMs: 33,
};

interface DASState {
  held: boolean;
  dasChargedMs: number;
  arrAccumMs: number;
  dasFired: boolean; // tracks whether DAS has already charged (for ARR=0 burst)
}

function createDASState(): DASState {
  return {
    held: false,
    dasChargedMs: 0,
    arrAccumMs: 0,
    dasFired: false,
  };
}

/**
 * Manages Delayed Auto-Shift (DAS) and Auto-Repeat Rate (ARR) for
 * movement actions (left, right, soft drop). Immediate actions
 * (hard drop, rotations, hold, pause) bypass this system entirely.
 */
export class DASManager {
  private leftState: DASState = createDASState();
  private rightState: DASState = createDASState();
  private softDropState: DASState = createDASState();
  private lastHorizontalDirection: 'left' | 'right' | null = null;
  private pendingActions: GameAction[] = [];
  private config: DASConfig;

  constructor(config?: Partial<DASConfig>) {
    this.config = { ...DEFAULT_DAS_CONFIG, ...config };
  }

  /**
   * Called when a DAS-processed key is pressed.
   * Sets held=true, fires immediately, resets accumulators.
   * Ignores non-DAS actions.
   */
  onKeyDown(action: GameAction): void {
    const state = this.getState(action);
    if (state === null) return;

    state.held = true;
    state.dasChargedMs = 0;
    state.arrAccumMs = 0;
    state.dasFired = false;

    // Track most-recent horizontal direction
    if (action === GameAction.MOVE_LEFT) {
      this.lastHorizontalDirection = 'left';
    } else if (action === GameAction.MOVE_RIGHT) {
      this.lastHorizontalDirection = 'right';
    }

    // Fire action immediately
    this.pendingActions.push(action);
  }

  /**
   * Called when a DAS-processed key is released.
   * Resets all state for that direction.
   * Ignores non-DAS actions.
   */
  onKeyUp(action: GameAction): void {
    const state = this.getState(action);
    if (state === null) return;

    state.held = false;
    state.dasChargedMs = 0;
    state.arrAccumMs = 0;
    state.dasFired = false;
  }

  /**
   * Processes DAS/ARR for all held keys and returns actions to fire.
   * Called once per game loop tick.
   */
  update(deltaMs: number): GameAction[] {
    const actions = [...this.pendingActions];
    this.pendingActions = [];

    // Process horizontal movement (direction priority)
    if (this.leftState.held && this.rightState.held) {
      // Both held: process only most recently pressed
      if (this.lastHorizontalDirection === 'left') {
        this.processState(this.leftState, GameAction.MOVE_LEFT, deltaMs, this.config.arrIntervalMs, actions);
      } else if (this.lastHorizontalDirection === 'right') {
        this.processState(this.rightState, GameAction.MOVE_RIGHT, deltaMs, this.config.arrIntervalMs, actions);
      }
    } else if (this.leftState.held) {
      this.processState(this.leftState, GameAction.MOVE_LEFT, deltaMs, this.config.arrIntervalMs, actions);
    } else if (this.rightState.held) {
      this.processState(this.rightState, GameAction.MOVE_RIGHT, deltaMs, this.config.arrIntervalMs, actions);
    }

    // Soft drop is independent
    if (this.softDropState.held) {
      this.processState(this.softDropState, GameAction.SOFT_DROP, deltaMs, this.config.softDropArrMs, actions);
    }

    return actions;
  }

  /**
   * Releases all keys. Called on blur/detach to prevent stuck keys.
   */
  releaseAll(): void {
    this.leftState = createDASState();
    this.rightState = createDASState();
    this.softDropState = createDASState();
    this.lastHorizontalDirection = null;
    this.pendingActions = [];
  }

  private processState(
    state: DASState,
    action: GameAction,
    deltaMs: number,
    arrMs: number,
    actions: GameAction[],
  ): void {
    if (!state.held || deltaMs === 0) return;

    const wasCharged = state.dasChargedMs >= this.config.dasDelayMs;

    if (!wasCharged) {
      // Accumulate toward DAS threshold
      state.dasChargedMs += deltaMs;

      if (state.dasChargedMs >= this.config.dasDelayMs) {
        // DAS just charged this frame
        state.dasFired = true;
        const overshoot = state.dasChargedMs - this.config.dasDelayMs;

        if (arrMs === 0) {
          // Instant DAS: fire BOARD_WIDTH actions (teleport to wall)
          for (let i = 0; i < BOARD_WIDTH; i++) {
            actions.push(action);
          }
          return;
        }

        // Fire once for DAS charge
        actions.push(action);

        // Leftover time goes to ARR
        state.arrAccumMs = overshoot;

        // Process ARR with leftover time
        while (state.arrAccumMs >= arrMs) {
          actions.push(action);
          state.arrAccumMs -= arrMs;
        }
      }
    } else {
      // Already in auto-repeat mode
      if (arrMs === 0) {
        // ARR=0 burst already fired; no further actions
        return;
      }

      state.arrAccumMs += deltaMs;

      while (state.arrAccumMs >= arrMs) {
        actions.push(action);
        state.arrAccumMs -= arrMs;
      }
    }
  }

  /**
   * Returns the DASState for a given action, or null if the action
   * is not a DAS-processed action.
   */
  private getState(action: GameAction): DASState | null {
    switch (action) {
      case GameAction.MOVE_LEFT:
        return this.leftState;
      case GameAction.MOVE_RIGHT:
        return this.rightState;
      case GameAction.SOFT_DROP:
        return this.softDropState;
      default:
        return null;
    }
  }
}
