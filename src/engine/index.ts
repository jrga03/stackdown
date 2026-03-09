// Types and enums
export {
  PieceType,
  RotationState,
  GameAction,
  GameMode,
  GameEventType,
  type Cell,
  type Grid,
  type Position,
  type ActivePieceState,
  type GameSnapshot,
  type GameConfig,
  type LineClearEvent,
  type EventMap,
} from './types';

// Constants
export {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
  SPAWN_ROW,
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  TICK_MS,
  PRACTICE_DURATION_MS,
  GRAVITY_TABLE,
  LINES_PER_LEVEL,
  SCORE_TABLE,
  ATTACK_TABLE,
  TSPIN_ATTACK_TABLE,
  TSPIN_MINI_ATTACK_TABLE,
  BACK_TO_BACK_ATTACK_BONUS,
  COMBO_ATTACK_TABLE,
} from './constants';

// Classes
export { GameEngine } from './GameEngine';
export { EventBus } from './EventBus';
export { Board } from './Board';
export { getBlocks } from './Piece';
export { tryRotation, type RotationResult } from './SRS';
export { Randomizer } from './Randomizer';
export { GravityTimer } from './GravityTimer';
export { LockDelay } from './LockDelay';
export { ScoreManager } from './ScoreManager';
export { ComboTracker } from './ComboTracker';
export { detectTSpin } from './TSpinDetector';
export { GarbageManager } from './GarbageManager';
