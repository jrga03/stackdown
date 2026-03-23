// ── Enums ──

export enum PieceType {
  I = 'I',
  O = 'O',
  T = 'T',
  S = 'S',
  Z = 'Z',
  J = 'J',
  L = 'L',
}

export enum RotationState {
  SPAWN = 0,
  RIGHT = 1,
  FLIP = 2,
  LEFT = 3,
}

export enum GameAction {
  MOVE_LEFT,
  MOVE_RIGHT,
  SOFT_DROP,
  HARD_DROP,
  ROTATE_CW,
  ROTATE_CCW,
  ROTATE_180,
  HOLD,
  PAUSE,
}

export enum GameMode {
  MARATHON = 'marathon',
  PRACTICE = 'practice',
  VERSUS = 'versus',
}

export enum GameEventType {
  PIECE_SPAWNED = 'piece_spawned',
  PIECE_MOVED = 'piece_moved',
  PIECE_ROTATED = 'piece_rotated',
  PIECE_LOCKED = 'piece_locked',
  PIECE_HELD = 'piece_held',
  LINE_CLEAR = 'line_clear',
  TSPIN = 'tspin',
  TSPIN_MINI = 'tspin_mini',
  COMBO = 'combo',
  BACK_TO_BACK = 'back_to_back',
  LEVEL_UP = 'level_up',
  GAME_OVER = 'game_over',
  HARD_DROP_IMPACT = 'hard_drop_impact',
  TIME_WARNING = 'time_warning',
  GARBAGE_RECEIVED = 'garbage_received',
  ATTACK_SENT = 'attack_sent',
  PERFECT_CLEAR = 'perfect_clear',
}

// ── Core Types ──

export type Cell = PieceType | 'GARBAGE' | null;
export type Grid = Cell[][]; // grid[row][col], row 0 = top

export interface Position {
  x: number; // column
  y: number; // row (0 = top, positive downward)
}

export interface ActivePieceState {
  type: PieceType;
  position: Position; // top-left of bounding box
  rotation: RotationState;
  lockDelayRemaining: number; // ms remaining before lock
  moveResetCount: number; // number of move resets used
  lastActionWasRotation: boolean; // for T-Spin detection
  lastKickIndex: number; // which wall kick test succeeded (0-4)
}

export interface GameSnapshot {
  grid: Grid; // 10x40 (20 visible + 20 buffer)
  activePiece: ActivePieceState | null;
  holdPiece: PieceType | null;
  holdUsed: boolean; // can only hold once per piece
  nextQueue: PieceType[]; // at least 5 pieces shown
  score: number;
  level: number;
  linesCleared: number;
  combo: number; // -1 = no active combo
  backToBack: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  elapsedMs: number;
  gameMode: GameMode;
  remainingMs: number | null; // null in marathon, countdown in practice
}

export interface GameConfig {
  mode: GameMode;
  startLevel: number;
}

// ── Event Payloads ──

export interface LineClearEvent {
  type: GameEventType.LINE_CLEAR;
  rows: number[];
  count: number; // 1-4
  isTSpin: boolean;
  isTSpinMini: boolean;
  isBackToBack: boolean;
  combo: number;
  pointsAwarded: number;
}

export type EventMap = {
  [GameEventType.PIECE_SPAWNED]: { type: PieceType };
  [GameEventType.PIECE_MOVED]: { direction: 'left' | 'right' | 'down' };
  [GameEventType.PIECE_ROTATED]: {
    direction: 'cw' | 'ccw' | '180';
    kickIndex: number;
  };
  [GameEventType.PIECE_LOCKED]: { type: PieceType; position: Position };
  [GameEventType.PIECE_HELD]: {
    heldPiece: PieceType;
    previousHeld: PieceType | null;
  };
  [GameEventType.LINE_CLEAR]: LineClearEvent;
  [GameEventType.TSPIN]: { mini: boolean; linesCleared: number };
  [GameEventType.TSPIN_MINI]: { mini: boolean; linesCleared: number };
  [GameEventType.COMBO]: { count: number; pointsAwarded: number };
  [GameEventType.BACK_TO_BACK]: { action: string; multiplier: number };
  [GameEventType.LEVEL_UP]: { newLevel: number };
  [GameEventType.GAME_OVER]: {
    finalScore: number;
    linesCleared: number;
    reason: 'topout' | 'timeout';
  };
  [GameEventType.HARD_DROP_IMPACT]: {
    column: number;
    row: number;
    distance: number;
  };
  [GameEventType.TIME_WARNING]: { remainingMs: number };
  [GameEventType.GARBAGE_RECEIVED]: { lines: number };
  [GameEventType.ATTACK_SENT]: { lines: number };
  [GameEventType.PERFECT_CLEAR]: { attackLines: number };
};
