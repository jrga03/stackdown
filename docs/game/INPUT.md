# Input System Spec

The input system handles keyboard events and implements Delayed Auto-Shift (DAS) and Auto-Repeat Rate (ARR) for movement actions. It translates raw key events into `GameAction` values that are fed to the engine.

## Key Bindings

### Default Bindings

| Action | Key | Key Code |
|--------|-----|----------|
| Move Left | ← | `ArrowLeft` |
| Move Right | → | `ArrowRight` |
| Soft Drop | ↓ | `ArrowDown` |
| Hard Drop | Space | `Space` |
| Rotate CW | ↑ | `ArrowUp` |
| Rotate CCW | Z | `KeyZ` |
| Rotate 180 | A | `KeyA` |
| Hold | Shift / C | `ShiftLeft` or `KeyC` |
| Pause | Escape | `Escape` |

### Key Binding Configuration

```typescript
interface KeyBindings {
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
```

Bindings use `KeyboardEvent.code` (physical key position) rather than `KeyboardEvent.key` (character produced), ensuring consistent behavior across keyboard layouts.

---

## Action Classification

Actions are split into two categories based on how they interact with the DAS/ARR system:

### Immediate Actions

These fire **once** on key press and are never auto-repeated:

- `HARD_DROP`
- `ROTATE_CW`
- `ROTATE_CCW`
- `ROTATE_180`
- `HOLD`
- `PAUSE`

### DAS-Processed Actions

These go through the DAS/ARR system for auto-repeat:

- `MOVE_LEFT`
- `MOVE_RIGHT`
- `SOFT_DROP`

---

## DAS/ARR Algorithm

### Configuration

```typescript
interface DASConfig {
  dasDelayMs: number;     // Default: 167ms (Tetris Guideline standard)
  arrIntervalMs: number;  // Default: 33ms (Tetris Guideline standard)
  softDropArrMs: number;  // Default: 33ms
}
```

### Per-Direction State

Separate state is tracked for left, right, and soft drop independently:

```typescript
interface DASState {
  held: boolean;          // is the key currently pressed?
  dasChargedMs: number;   // time accumulated toward DAS threshold
  arrAccumMs: number;     // time accumulated toward next ARR fire
}
```

### Algorithm (per direction)

```
1. ON KEY PRESS:
   - Set held = true
   - Fire the action IMMEDIATELY (one move)
   - Reset dasChargedMs = 0
   - Reset arrAccumMs = 0

2. EACH FRAME (while held = true):
   - If DAS not yet charged (dasChargedMs < dasDelayMs):
       dasChargedMs += deltaMs
   - If DAS just charged (dasChargedMs >= dasDelayMs):
       Enter auto-repeat mode
       arrAccumMs += deltaMs - (dasChargedMs - dasDelayMs)  // account for overshoot
   - While in auto-repeat AND arrAccumMs >= arrIntervalMs:
       Fire the action
       arrAccumMs -= arrIntervalMs

3. ON KEY RELEASE:
   - Set held = false
   - Reset dasChargedMs = 0
   - Reset arrAccumMs = 0
```

### Instant DAS (ARR = 0)

If `arrIntervalMs` is 0, the piece teleports to the wall immediately when DAS charges:

- Fire `BOARD_WIDTH` actions at once (guarantees the piece reaches the wall regardless of starting position).
- No further auto-repeat after that (already at the wall).

### Timing Example (defaults: DAS=167ms, ARR=33ms)

```
Time(ms)  Event
  0       Key pressed → IMMEDIATE action (1st move)
  0-167   Charging DAS...
  167     DAS charged → action fires (2nd move)
  200     ARR fires (3rd move)
  233     ARR fires (4th move)
  266     ARR fires (5th move)
  ...     continues every 33ms
```

---

## Direction Priority

When both left and right keys are held simultaneously, the **most recently pressed** direction takes priority.

### Implementation

```typescript
class DASManager {
  private leftState: DASState;
  private rightState: DASState;
  private softDropState: DASState;
  private lastHorizontalDirection: 'left' | 'right' | null;

  onKeyDown(action: GameAction): void {
    if (action === GameAction.MOVE_LEFT) {
      this.leftState.held = true;
      this.lastHorizontalDirection = 'left';
      // ... reset and fire
    }
    if (action === GameAction.MOVE_RIGHT) {
      this.rightState.held = true;
      this.lastHorizontalDirection = 'right';
      // ... reset and fire
    }
  }

  update(deltaMs: number): GameAction[] {
    const actions: GameAction[] = [];

    // Only process the most recently pressed horizontal direction
    if (this.leftState.held && this.rightState.held) {
      // Process only lastHorizontalDirection
    } else if (this.leftState.held) {
      // Process left
    } else if (this.rightState.held) {
      // Process right
    }

    // Soft drop is independent of horizontal movement
    if (this.softDropState.held) {
      // Process soft drop
    }

    return actions;
  }
}
```

---

## OS Key Repeat Rejection

Modern operating systems generate repeated `keydown` events when a key is held. These must be filtered out because the game implements its own DAS/ARR.

### Detection

`KeyboardEvent.repeat` is `true` for OS-generated repeat events.

### Handling

```typescript
class KeyboardManager {
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;  // Reject OS key repeat

    e.preventDefault();    // Prevent browser default (e.g., scrolling on arrow keys)

    const action = this.inputMapper.mapKey(e.code);
    if (action === null) return;

    if (isImmediateAction(action)) {
      this.actionCallback(action);
    } else {
      this.dasManager.onKeyDown(action);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const action = this.inputMapper.mapKey(e.code);
    if (action === null) return;

    this.dasManager.onKeyUp(action);
  };
}
```

---

## InputMapper

Maps `KeyboardEvent.code` values to `GameAction` values using the configured key bindings.

```typescript
class InputMapper {
  private bindings: Map<string, GameAction>;

  constructor(keyBindings: KeyBindings);
  mapKey(code: string): GameAction | null;
  updateBindings(keyBindings: KeyBindings): void;
}
```

---

## KeyboardManager

Manages event listeners on `window` and coordinates between `InputMapper` and `DASManager`.

```typescript
class KeyboardManager {
  constructor(
    inputMapper: InputMapper,
    dasManager: DASManager,
    actionCallback: (action: GameAction) => void
  );

  attach(): void;     // Add keydown/keyup listeners to window
  detach(): void;     // Remove listeners (cleanup)
  isKeyHeld(code: string): boolean;
}
```

### Lifecycle

1. `GameSession` creates `KeyboardManager` with a callback that calls `engine.applyAction()`.
2. `attach()` is called when the game starts.
3. `detach()` is called when the game pauses, ends, or the component unmounts.
4. DAS state is cleared on detach to prevent stuck keys.

### Input During Pause and Game Over

When `PAUSE` is pressed:
1. `engine.applyAction(PAUSE)` fires immediately (PAUSE is an immediate action).
2. `KeyboardManager.detach()` is called by `GameSession`.
3. All DAS state is fully reset (accumulators cleared, held flags cleared).
4. On resume, `KeyboardManager.attach()` is called. Input processing restarts from a clean state — no stuck keys.

During game over: all game input is ignored. Only menu button clicks (React) are processed.

### Window Focus Handling

`KeyboardManager` must handle `window.blur` to prevent stuck keys when the user switches tabs:

1. On `window` `blur` event: call `dasManager.releaseAll()` to simulate keyup for all held keys, clearing all DAS state.
2. On `window` `focus` event: no special action needed — input processing resumes normally from a clean state.

### Input During Line Clear Animations

The engine continues processing input during line clear animations. Animations are renderer-only visual effects — the engine has already resolved the line clear and spawned the next piece before the animation begins. Player input applies to the newly spawned piece immediately.

---

## Integration with Game Loop

The `DASManager.update(deltaMs)` method is called once per game loop tick (not per frame). It returns an array of `GameAction` values to apply:

```
Game Loop Tick:
  1. dasActions = dasManager.update(deltaMs)
  2. for each action in dasActions:
       engine.applyAction(action)
  3. engine.tick(deltaMs)
```

Immediate actions bypass this flow — they are applied directly via the `actionCallback` in `KeyboardManager.onKeyDown`.
