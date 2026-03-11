# Engine Module Spec

The engine is a pure TypeScript module with zero DOM or browser dependencies. It manages all game logic: board state, piece mechanics, scoring, gravity, lock delay, and events.

## Type Definitions

### Enums

```typescript
enum PieceType { I = 'I', O = 'O', T = 'T', S = 'S', Z = 'Z', J = 'J', L = 'L' }

enum RotationState { SPAWN = 0, RIGHT = 1, FLIP = 2, LEFT = 3 }

enum GameAction {
  MOVE_LEFT, MOVE_RIGHT, SOFT_DROP, HARD_DROP,
  ROTATE_CW, ROTATE_CCW, ROTATE_180, HOLD, PAUSE
}

enum GameMode { MARATHON = 'marathon', PRACTICE = 'practice' }

enum GameEventType {
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
  // Future multiplayer:
  // GARBAGE_RECEIVED, GARBAGE_SENT, ATTACK
}
```

### Core Types

```typescript
type Cell = PieceType | null;
type Grid = Cell[][];  // grid[row][col], row 0 = top

interface Position {
  x: number;  // column
  y: number;  // row (0 = top, positive downward)
}

interface ActivePieceState {
  type: PieceType;
  position: Position;              // top-left of bounding box
  rotation: RotationState;
  lockDelayRemaining: number;      // ms remaining before lock
  moveResetCount: number;          // number of move resets used
  lastActionWasRotation: boolean;  // for T-Spin detection
  lastKickIndex: number;           // which wall kick test succeeded (0-4)
}

interface GameSnapshot {
  grid: Grid;                      // 10x40 (20 visible + 20 buffer)
  activePiece: ActivePieceState | null;
  holdPiece: PieceType | null;
  holdUsed: boolean;               // can only hold once per piece
  nextQueue: PieceType[];          // at least 5 pieces shown
  score: number;
  level: number;
  linesCleared: number;
  combo: number;                   // -1 = no active combo
  backToBack: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  elapsedMs: number;
  gameMode: GameMode;
  remainingMs: number | null;      // null in marathon, countdown in practice
}
```

### Event Payloads

```typescript
interface LineClearEvent {
  type: GameEventType.LINE_CLEAR;
  rows: number[];           // which rows were cleared
  count: number;            // 1-4
  isTSpin: boolean;
  isTSpinMini: boolean;
  isBackToBack: boolean;
  combo: number;
  pointsAwarded: number;
  // Future: attackLinesSent: number;
}

type EventMap = {
  [GameEventType.PIECE_SPAWNED]: { type: PieceType };
  [GameEventType.PIECE_MOVED]: { direction: 'left' | 'right' | 'down' };
  [GameEventType.PIECE_ROTATED]: { direction: 'cw' | 'ccw' | '180'; kickIndex: number };
  [GameEventType.PIECE_LOCKED]: { type: PieceType; position: Position };
  [GameEventType.PIECE_HELD]: { heldPiece: PieceType; previousHeld: PieceType | null };
  [GameEventType.LINE_CLEAR]: LineClearEvent;
  [GameEventType.TSPIN]: { mini: boolean; linesCleared: number };
  [GameEventType.COMBO]: { count: number; pointsAwarded: number };
  [GameEventType.BACK_TO_BACK]: { action: string; multiplier: number };
  [GameEventType.LEVEL_UP]: { newLevel: number };
  [GameEventType.GAME_OVER]: { finalScore: number; linesCleared: number; reason: 'topout' | 'timeout' };
  [GameEventType.HARD_DROP_IMPACT]: { column: number; row: number; distance: number };
  [GameEventType.TIME_WARNING]: { remainingMs: number };
};
```

### Attack Table (Future, Stubbed)

```typescript
interface AttackTable {
  single: number;              // 0
  double: number;              // 1
  triple: number;              // 2
  quad: number;                // 4
  tspinMiniSingle: number;     // 0
  tspinSingle: number;         // 2
  tspinDouble: number;         // 4
  tspinTriple: number;         // 6
  backToBackMultiplier: number; // +1
  comboTable: number[];        // [0, 1, 1, 2, 2, 3, 3, 4, ...]
  perfectClear: number;        // 10
}
```

## Constants

```typescript
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 40;        // total rows (top 20 are buffer)
const VISIBLE_HEIGHT = 20;
const SPAWN_ROW = 18;           // rows 18-19 are just above visible area
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;
const TICK_MS = 16.667;         // ~60 ticks/second
const PRACTICE_DURATION_MS = 120_000; // 2 minutes
```

---

## Board

### Grid Structure

- 10 columns x 40 rows.
- Row 0 is the very top (buffer zone). Row 20 is the top of the visible area. Row 39 is the bottom.
- The top 20 rows (0-19) are the buffer zone — pieces spawn here but they are not rendered.
- `grid[row][col]` stores `PieceType | null`.

### Collision Detection

`isValidPosition(blocks: Position[], grid: Grid): boolean`

A position is valid if all block coordinates:
1. Are within column bounds: `0 <= x < BOARD_WIDTH`
2. Are within row bounds: `0 <= y < BOARD_HEIGHT`
3. Do not overlap an occupied cell: `grid[y][x] === null`

### Line Clearing

`clearFullRows(): number[]`

1. Iterate all rows from bottom to top.
2. A row is full when every cell is non-null.
3. Remove full rows from the grid array.
4. Insert empty rows at the top to maintain grid height.
5. Return the array of cleared row indices (in their original positions, before removal).

### Garbage Insertion (Stubbed for Multiplayer)

`insertGarbageRows(count: number, gapColumn: number): void`

1. Remove `count` rows from the top of the grid.
2. Append `count` rows at the bottom, filled with a garbage cell type except for `gapColumn` which is null.
3. If inserted garbage pushes the active piece into an occupied cell, trigger game over.

---

## Piece Shapes

All 7 tetrominoes defined as `Position[][]` — indexed by `[rotationState][blockIndex]`. Coordinates are relative to bounding box origin (top-left).

### I Piece (4x4 bounding box)

```
State 0 (Spawn):     State R (Right):    State 2 (Flip):     State L (Left):
. . . .               . . X .             . . . .             . X . .
X X X X               . . X .             . . . .             . X . .
. . . .               . . X .             X X X X             . X . .
. . . .               . . X .             . . . .             . X . .
```

```typescript
[PieceType.I]: [
  [{x:0,y:1}, {x:1,y:1}, {x:2,y:1}, {x:3,y:1}],  // State 0
  [{x:2,y:0}, {x:2,y:1}, {x:2,y:2}, {x:2,y:3}],  // State R
  [{x:0,y:2}, {x:1,y:2}, {x:2,y:2}, {x:3,y:2}],  // State 2
  [{x:1,y:0}, {x:1,y:1}, {x:1,y:2}, {x:1,y:3}],  // State L
]
```

### O Piece (2x2 bounding box)

```
State 0-3 (all identical relative shape):
X X
X X
```

```typescript
[PieceType.O]: [
  [{x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}],  // State 0
  [{x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}],  // State R
  [{x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}],  // State 2
  [{x:0,y:0}, {x:1,y:0}, {x:0,y:1}, {x:1,y:1}],  // State L
]
```

### T Piece (3x3 bounding box)

```
State 0:    State R:    State 2:    State L:
. X .       . X .       . . .       . X .
X X X       . X X       X X X       X X .
. . .       . X .       . X .       . X .
```

```typescript
[PieceType.T]: [
  [{x:1,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:1}],  // State 0
  [{x:1,y:0}, {x:1,y:1}, {x:2,y:1}, {x:1,y:2}],  // State R
  [{x:0,y:1}, {x:1,y:1}, {x:2,y:1}, {x:1,y:2}],  // State 2
  [{x:1,y:0}, {x:0,y:1}, {x:1,y:1}, {x:1,y:2}],  // State L
]
```

### S Piece (3x3 bounding box)

```
State 0:    State R:    State 2:    State L:
. X X       . X .       . . .       X . .
X X .       . X X       . X X       X X .
. . .       . . X       X X .       . X .
```

```typescript
[PieceType.S]: [
  [{x:1,y:0}, {x:2,y:0}, {x:0,y:1}, {x:1,y:1}],  // State 0
  [{x:1,y:0}, {x:1,y:1}, {x:2,y:1}, {x:2,y:2}],  // State R
  [{x:1,y:1}, {x:2,y:1}, {x:0,y:2}, {x:1,y:2}],  // State 2
  [{x:0,y:0}, {x:0,y:1}, {x:1,y:1}, {x:1,y:2}],  // State L
]
```

### Z Piece (3x3 bounding box)

```
State 0:    State R:    State 2:    State L:
X X .       . . X       . . .       . X .
. X X       . X X       X X .       X X .
. . .       . X .       . X X       X . .
```

```typescript
[PieceType.Z]: [
  [{x:0,y:0}, {x:1,y:0}, {x:1,y:1}, {x:2,y:1}],  // State 0
  [{x:2,y:0}, {x:1,y:1}, {x:2,y:1}, {x:1,y:2}],  // State R
  [{x:0,y:1}, {x:1,y:1}, {x:1,y:2}, {x:2,y:2}],  // State 2
  [{x:1,y:0}, {x:0,y:1}, {x:1,y:1}, {x:0,y:2}],  // State L
]
```

### J Piece (3x3 bounding box)

```
State 0:    State R:    State 2:    State L:
X . .       . X X       . . .       . X .
X X X       . X .       X X X       . X .
. . .       . X .       . . X       X X .
```

```typescript
[PieceType.J]: [
  [{x:0,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:1}],  // State 0
  [{x:1,y:0}, {x:2,y:0}, {x:1,y:1}, {x:1,y:2}],  // State R
  [{x:0,y:1}, {x:1,y:1}, {x:2,y:1}, {x:2,y:2}],  // State 2
  [{x:1,y:0}, {x:1,y:1}, {x:0,y:2}, {x:1,y:2}],  // State L
]
```

### L Piece (3x3 bounding box)

```
State 0:    State R:    State 2:    State L:
. . X       . X .       . . .       X X .
X X X       . X .       X X X       . X .
. . .       . X X       X . .       . X .
```

```typescript
[PieceType.L]: [
  [{x:2,y:0}, {x:0,y:1}, {x:1,y:1}, {x:2,y:1}],  // State 0
  [{x:1,y:0}, {x:1,y:1}, {x:1,y:2}, {x:2,y:2}],  // State R
  [{x:0,y:1}, {x:1,y:1}, {x:2,y:1}, {x:0,y:2}],  // State 2
  [{x:0,y:0}, {x:1,y:0}, {x:1,y:1}, {x:1,y:2}],  // State L
]
```

---

## Super Rotation System (SRS)

### Overview

When a rotation is attempted, the engine first tries placing the piece in the new rotation state at the current position (test 0). If that fails due to collision, it tries up to 4 wall kick offsets. If all 5 tests fail, the rotation is rejected.

### Kick Computation

For a rotation from state A to state B:

```
For each test index i = 0, 1, 2, 3, 4:
  kickX = offsetTable[A][i].x - offsetTable[B][i].x
  kickY = offsetTable[A][i].y - offsetTable[B][i].y
  testPosition = {
    x: currentPosition.x + kickX,
    y: currentPosition.y - kickY    // y-axis is inverted (positive = down in grid)
  }
  if isValidPosition(piece at testPosition): accept rotation, record kickIndex = i
```

### JLSTZ Offset Table

Used for J, L, S, T, and Z pieces.

| State | Test 0 | Test 1 | Test 2 | Test 3 | Test 4 |
|-------|--------|--------|--------|--------|--------|
| 0 (Spawn) | (0, 0) | (0, 0) | (0, 0) | (0, 0) | (0, 0) |
| R (Right) | (0, 0) | (+1, 0) | (+1, -1) | (0, +2) | (+1, +2) |
| 2 (Flip) | (0, 0) | (0, 0) | (0, 0) | (0, 0) | (0, 0) |
| L (Left) | (0, 0) | (-1, 0) | (-1, -1) | (0, +2) | (-1, +2) |

```typescript
const JLSTZ_OFFSETS: Position[][] = [
  [{x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}],   // State 0
  [{x:0,y:0}, {x:1,y:0}, {x:1,y:-1}, {x:0,y:2}, {x:1,y:2}],   // State R
  [{x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}],   // State 2
  [{x:0,y:0}, {x:-1,y:0}, {x:-1,y:-1}, {x:0,y:2}, {x:-1,y:2}], // State L
];
```

### I Piece Offset Table

| State | Test 0 | Test 1 | Test 2 | Test 3 | Test 4 |
|-------|--------|--------|--------|--------|--------|
| 0 (Spawn) | (0, 0) | (-1, 0) | (+2, 0) | (-1, 0) | (+2, 0) |
| R (Right) | (-1, 0) | (0, 0) | (0, 0) | (0, +1) | (0, -2) |
| 2 (Flip) | (-1, +1) | (+1, +1) | (-2, +1) | (+1, 0) | (-2, 0) |
| L (Left) | (0, +1) | (0, +1) | (0, +1) | (0, -1) | (0, +2) |

```typescript
const I_OFFSETS: Position[][] = [
  [{x:0,y:0}, {x:-1,y:0}, {x:2,y:0}, {x:-1,y:0}, {x:2,y:0}],   // State 0
  [{x:-1,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:1}, {x:0,y:-2}],   // State R
  [{x:-1,y:1}, {x:1,y:1}, {x:-2,y:1}, {x:1,y:0}, {x:-2,y:0}],  // State 2
  [{x:0,y:1}, {x:0,y:1}, {x:0,y:1}, {x:0,y:-1}, {x:0,y:2}],    // State L
];
```

### O Piece Offset Table

The O piece has unique offsets that effectively prevent rotation from changing its position, but the SRS offset system still applies for consistency.

| State | Test 0 |
|-------|--------|
| 0 (Spawn) | (0, 0) |
| R (Right) | (0, -1) |
| 2 (Flip) | (-1, -1) |
| L (Left) | (-1, 0) |

```typescript
const O_OFFSETS: Position[][] = [
  [{x:0,y:0}],    // State 0
  [{x:0,y:-1}],   // State R
  [{x:-1,y:-1}],  // State 2
  [{x:-1,y:0}],   // State L
];
```

> **Note:** O-piece does not use wall kicks (only 1 test per rotation). After any O-piece rotation, `lastKickIndex` is set to `0`.

---

## 7-Bag Randomizer

### Algorithm

1. Maintain a queue of upcoming pieces (pre-filled with 14 pieces = 2 bags).
2. `generateBag()`: Create an array of all 7 piece types, then Fisher-Yates shuffle it.
3. `next()`: Dequeue the first piece. If the queue drops below 7 pieces, generate and append a new bag.
4. `peek(count)`: Return the next `count` pieces without consuming them.

### Seeded PRNG

The randomizer accepts an optional seed for deterministic sequences. Uses mulberry32 or xorshift128+ PRNG internally.

```typescript
class Randomizer {
  private queue: PieceType[];
  private rng: () => number;  // returns [0, 1)

  constructor(seed?: number);
  next(): PieceType;
  peek(count: number): PieceType[];
  private generateBag(): PieceType[];
  private shuffle(arr: PieceType[]): PieceType[];
}
```

---

## T-Spin Detection

### 3-Corner Rule

T-Spin detection applies **only** to T pieces and **only** when the last action before locking was a rotation (`lastActionWasRotation === true`).

### Algorithm

1. Find the T piece center: offset `(1, 1)` in the 3x3 bounding box, so absolute position = `(position.x + 1, position.y + 1)`.

2. Check all 4 diagonal corners around the center:
   - A = top-left: `(centerX - 1, centerY - 1)`
   - B = top-right: `(centerX + 1, centerY - 1)`
   - C = bottom-left: `(centerX - 1, centerY + 1)`
   - D = bottom-right: `(centerX + 1, centerY + 1)`

3. A corner is **occupied** if:
   - It's out of bounds (wall or floor) → occupied
   - The grid cell is non-null → occupied
   - It's above the board top (y < 0) → **not** occupied

4. Count occupied corners. If **fewer than 3** → no T-Spin.

5. If 3 or more corners are filled:
   - If `lastKickIndex === 4` (the final wall kick test was used) → **always proper T-Spin** (regardless of front corners).
   - Otherwise, check the "front corners" based on current rotation state:

| Rotation State | Flat Face | Front Corners |
|---------------|-----------|---------------|
| 0 (Spawn) | Top | A (top-left), B (top-right) |
| R (Right) | Right | B (top-right), D (bottom-right) |
| 2 (Flip) | Bottom | C (bottom-left), D (bottom-right) |
| L (Left) | Left | A (top-left), C (bottom-left) |

6. If **both** front corners are occupied → **proper T-Spin**.
7. If **only one** front corner is occupied → **T-Spin Mini**.

---

## Lock Delay

### Parameters

- **Lock delay timer:** 500ms
- **Max move resets:** 15
- **Max rotation resets:** 15

### Behavior

1. When the active piece comes to rest on a surface (cannot move down), start the lock delay timer at 500ms.
2. The timer counts down each tick by `deltaMs`.
3. Any successful move (left, right, down) or rotation resets the timer back to 500ms, if resets remain.
4. Each reset decrements the reset counter. Move resets and rotation resets share the same counter (15 total).
5. When the timer reaches 0, the piece locks in place.
6. If the piece moves off the surface (e.g., a line clear beneath it removes supporting blocks), the lock delay deactivates. The timer resets to 500ms and the reset counter restores to 15. When the piece lands on a new surface, lock delay reactivates with a fresh timer and full resets.

```typescript
class LockDelay {
  private timer: number;        // ms remaining
  private resetsRemaining: number;   // resets remaining (starts at 15, counts down)

  constructor();
  start(): void;
  tick(deltaMs: number): boolean;  // returns true if piece should lock
  reset(): boolean;                // returns false if no resets remain
  isActive(): boolean;
  deactivate(): void;
}
```

---

## Gravity

### Per-Level Timing

Gravity determines how many milliseconds between automatic downward movements.

| Level | ms/cell |
|-------|---------|
| 1 | 1000 |
| 2 | 793 |
| 3 | 618 |
| 4 | 473 |
| 5 | 355 |
| 6 | 262 |
| 7 | 190 |
| 8 | 135 |
| 9 | 94 |
| 10 | 64 |
| 11 | 43 |
| 12 | 28 |
| 13 | 18 |
| 14 | 11 |
| 15 | 7 |

### Lines Per Level

| Levels | Lines to Advance |
|--------|-----------------|
| 1–5 | 5 lines each |
| 6–10 | 10 lines each |
| 11–15 | 15 lines each |

### Mode-Specific Behavior

- **Marathon:** Levels advance per the table above. After clearing the required lines, the level increments and gravity speeds up.
- **Practice:** Level is fixed at `startLevel` for the entire session. `checkLevelUp()` is skipped (always returns null). Gravity uses the fixed level's timing.

### GravityTimer

```typescript
class GravityTimer {
  private accumulator: number;

  constructor();
  tick(deltaMs: number, level: number): number;  // returns cells to drop
  reset(): void;
  getIntervalForLevel(level: number): number;
}
```

The accumulator adds `deltaMs` each tick. When it exceeds the interval for the current level, the piece drops one cell and the interval is subtracted from the accumulator. Multiple drops can occur in a single tick at high levels.

---

## Scoring

### Base Points Table

All base points are multiplied by the current level.

| Action | Base Points |
|--------|------------|
| Single (1 line) | 100 |
| Double (2 lines) | 300 |
| Triple (3 lines) | 500 |
| Quad (4 lines) | 800 |
| T-Spin (no lines) | 400 |
| T-Spin Single | 800 |
| T-Spin Double | 1200 |
| T-Spin Triple | 1600 |
| T-Spin Mini (no lines) | 100 |
| T-Spin Mini Single | 200 |
| T-Spin Mini Double | 400 |

> **Note:** T-Spin base points **replace** (not add to) normal line clear base points. For example, a T-Spin Single awards 800 × level, not (800 + 100) × level.

### Score Formula

```
points = basePoints × level
```

### Back-to-Back Bonus

- **Applicable to:** Quad (4-line clear) and full T-Spin clears. T-Spin Mini clears do **not** qualify for back-to-back.
- **Multiplier:** ×1.5 (applied as `Math.floor(points * 1.5)`).
- The back-to-back flag is set after a difficult clear and persists until a non-difficult line clear occurs.
- A non-line-clearing action (piece locks without clearing) does **not** reset back-to-back.

### Combo Bonus

- Combo counter starts at **-1** (no active combo).
- **Each consecutive piece that clears at least one line** increments the counter by 1.
- A piece that locks without clearing lines resets the counter to -1.
- Bonus per combo (when combo > 0):

```
comboBonus = 50 × combo × level
```

- Total score for a clearing action = `(basePoints × level [× 1.5 if B2B]) + comboBonus`

### Drop Points

- **Soft drop:** +1 point per cell dropped.
- **Hard drop:** +2 points per cell dropped.
- Drop points are **not** multiplied by level.

### ScoreManager

```typescript
class ScoreManager {
  private score: number;
  private level: number;
  private linesCleared: number;
  private combo: number;         // -1 = inactive
  private backToBack: boolean;

  constructor(options?: { startLevel?: number; fixedLevel?: boolean });
  // `level` is initialized to `startLevel` (default 1).
  // When `fixedLevel` is true, `checkLevelUp()` always returns null.

  processLineClear(count: number, isTSpin: boolean, isTSpinMini: boolean, combo: number): number;
  // Returns total points awarded for this clear: (basePoints × level [× 1.5 if B2B]) + comboBonus.
  // Combo bonus is calculated internally — no separate call needed.

  processTSpinNoLines(mini: boolean): number;
  addDropPoints(cells: number, isHardDrop: boolean): void;
  checkLevelUp(): number | null;  // returns new level or null; always null when fixedLevel is true
  getScore(): number;
  getLevel(): number;
  getLinesCleared(): number;
}
```

When `fixedLevel` is `true` (practice mode), `checkLevelUp()` always returns `null` — the level never advances. The scoring multiplier still uses the fixed level value.

---

## EventBus

### Design

- Pure TypeScript. No DOM events, no React context.
- Typed with `EventMap` for type-safe subscriptions.
- `on()` returns an unsubscribe function.
- Lives inside the engine module but is passed to external consumers (renderer, UI).

### API

```typescript
class EventBus {
  on<K extends keyof EventMap>(
    event: K,
    callback: (payload: EventMap[K]) => void
  ): () => void;  // returns unsubscribe function

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;

  removeAllListeners(): void;
}
```

### Subscribers

| Subscriber | Events | Purpose |
|-----------|--------|---------|
| `AnimationManager` | `LINE_CLEAR`, `HARD_DROP_IMPACT` | Trigger visual effects |
| `TextPopup` | `LINE_CLEAR`, `TSPIN`, `COMBO`, `BACK_TO_BACK` | Show score/action text |
| React HUD | `LEVEL_UP`, `GAME_OVER` | Update UI state |
| Future: NetworkManager | `LINE_CLEAR`, `TSPIN` | Calculate and send attack lines |

---

## GameEngine API

The `GameEngine` class is the single entry point for all game logic.

### Constructor

```typescript
constructor(eventBus: EventBus, options?: {
  seed?: number;
  mode?: GameMode;       // default: MARATHON
  startLevel?: number;   // default: 1
})
```

Creates a new game with an empty board, fills the randomizer, and spawns the first piece. When `mode` is `PRACTICE`, initializes `remainingMs` to `PRACTICE_DURATION_MS` and passes `{ startLevel, fixedLevel: true }` to `ScoreManager`.

### Methods

#### `tick(deltaMs: number): void`

Advances the game by `deltaMs` milliseconds. Called once per fixed timestep tick (~16.667ms).

Operations performed each tick:
1. If paused or game over: no-op.
2. Update elapsed time.
3. **Practice mode timer:** If mode is `PRACTICE`, decrement `remainingMs` by `deltaMs`. Emit `TIME_WARNING` once when `remainingMs` crosses below 10000ms. If `remainingMs <= 0`, trigger game over with `reason: 'timeout'`.
   - **Pause behavior:** When paused, `remainingMs` does not decrement. The timer freezes and resumes from the same value on unpause.
4. Apply gravity: accumulate time, drop piece by computed cells.
5. Process lock delay: if piece is on surface, count down timer. Lock piece if timer expires.
6. After locking: clear full rows, update score, check level up (skipped in practice mode), spawn next piece.
7. If new piece cannot spawn (any block of the new piece overlaps an occupied cell at spawn position row 18): game over with `reason: 'topout'`. The colliding piece is not placed on the grid.

#### `applyAction(action: GameAction): void`

Applies a discrete player action. Called by the input system when a key event or DAS tick fires — **not** called per engine tick.

| Action | Behavior |
|--------|----------|
| `MOVE_LEFT` | Move piece 1 cell left if valid |
| `MOVE_RIGHT` | Move piece 1 cell right if valid |
| `SOFT_DROP` | Move piece 1 cell down if valid, add 1 drop point |
| `HARD_DROP` | Drop piece to lowest valid position, add 2 points per cell, lock immediately |
| `ROTATE_CW` | Rotate clockwise with SRS wall kicks |
| `ROTATE_CCW` | Rotate counter-clockwise with SRS wall kicks |
| `ROTATE_180` | Rotate 180 degrees (two CW rotations with kicks) |
| `HOLD` | Swap active piece with hold, or hold current and spawn next. Once per piece. |
| `PAUSE` | Toggle pause state |

> **Soft drop and gravity interaction:** When soft drop is active (key held), the gravity timer does not advance. Soft drop provides its own downward movement, replacing gravity for that duration.

> **Hard drop lock behavior:** Hard drop locks the piece instantly — it bypasses lock delay entirely. No timer, no resets. The piece is placed at the lowest valid position and locked in the same tick.

#### `getSnapshot(): GameSnapshot`

Returns a read-only snapshot of the current game state. This is a plain value object (no methods, no circular references) suitable for:
- Passing to the renderer for drawing.
- Passing to React for HUD updates.
- Serializing with `JSON.stringify()` for network transmission.

#### `static fromSnapshot(snapshot: GameSnapshot, eventBus: EventBus): GameEngine`

*(Future feature — not implemented in initial release.)*

Reconstructs a `GameEngine` from a serialized snapshot. Used for:
- Server reconciliation in multiplayer.
- Replay/spectator mode.
- Save/load game state.
