# Docs Audit Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply 27 fixes across 5 spec documents to resolve gaps, ambiguities, and inconsistencies found during the docs audit.

**Architecture:** Pure documentation edits — no code, no tests. Each task targets one file with exact text replacements.

**Tech Stack:** Markdown files only.

---

### Task 1: ENGINE.md — ScoreManager API fixes (changes 1, 11)

**Files:**
- Modify: `docs/ENGINE.md:606-622` (ScoreManager class)

**Step 1: Remove `addComboBonus()` and update `processLineClear()` signature**

Replace the ScoreManager class definition. `processLineClear()` now takes `combo` parameter and handles all scoring (base + B2B + combo). `addComboBonus()` is removed. Constructor clarification added.

Old text (lines 606-622):
```
class ScoreManager {
  private score: number;
  private level: number;
  private linesCleared: number;
  private combo: number;         // -1 = inactive
  private backToBack: boolean;

  constructor(options?: { startLevel?: number; fixedLevel?: boolean });
  processLineClear(count: number, isTSpin: boolean, isTSpinMini: boolean): number;
  processTSpinNoLines(mini: boolean): number;
  addDropPoints(cells: number, isHardDrop: boolean): void;
  addComboBonus(): number;
  checkLevelUp(): number | null;  // returns new level or null; always null when fixedLevel is true
  getScore(): number;
  getLevel(): number;
  getLinesCleared(): number;
}
```

New text:
```
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

**Step 2: Commit**

```bash
git add docs/ENGINE.md
git commit -m "docs(engine): fix ScoreManager API — merge combo into processLineClear, clarify constructor"
```

---

### Task 2: ENGINE.md — Scoring clarifications (changes 2, 3)

**Files:**
- Modify: `docs/ENGINE.md:553-583` (Scoring section)

**Step 1: Add T-Spin scoring clarification after base points table**

After line 570 (`| T-Spin Mini Double | 400 |`), before `### Score Formula`, add:

```
> **Note:** T-Spin base points **replace** (not add to) normal line clear base points. For example, a T-Spin Single awards 800 × level, not (800 + 100) × level.
```

**Step 2: Fix B2B to exclude T-Spin Mini**

Replace line 579:
```
- **Applicable to:** Quad and any T-Spin clear (including Mini).
```

With:
```
- **Applicable to:** Quad and full T-Spin clears. T-Spin Mini clears do **not** qualify for back-to-back.
```

**Step 3: Commit**

```bash
git add docs/ENGINE.md
git commit -m "docs(engine): clarify T-Spin scoring replaces base, B2B excludes T-Spin Mini"
```

---

### Task 3: ENGINE.md — Gravity and drop clarifications (changes 4, 5)

**Files:**
- Modify: `docs/ENGINE.md:697-704` (applyAction table)

**Step 1: Add soft drop + gravity interaction note**

After the `SOFT_DROP` row in the applyAction table (line 703), add a note:

After line 709 (`| `PAUSE` | Toggle pause state |`), add:

```

> **Soft drop and gravity interaction:** When soft drop is active (key held), the gravity timer does not advance. Soft drop provides its own downward movement, replacing gravity for that duration.

> **Hard drop lock behavior:** Hard drop locks the piece instantly — it bypasses lock delay entirely. No timer, no resets. The piece is placed at the lowest valid position and locked in the same tick.
```

**Step 2: Commit**

```bash
git add docs/ENGINE.md
git commit -m "docs(engine): clarify soft drop bypasses gravity, hard drop bypasses lock delay"
```

---

### Task 4: ENGINE.md — Lock delay clarifications (changes 6, 7)

**Files:**
- Modify: `docs/ENGINE.md:464-492` (Lock Delay section)

**Step 1: Clarify line clear interaction**

Replace line 479:
```
6. If the piece moves off the surface (e.g., the row below it clears), the lock delay deactivates until it lands again.
```

With:
```
6. If the piece moves off the surface (e.g., a line clear beneath it removes supporting blocks), the lock delay deactivates. The timer resets to 500ms and the reset counter restores to 15. When the piece lands on a new surface, lock delay reactivates with a fresh timer and full resets.
```

**Step 2: Fix counter direction in class definition**

Replace line 484:
```
  private resetCount: number;   // resets used
```

With:
```
  private resetsRemaining: number;   // resets remaining (starts at 15, counts down)
```

**Step 3: Commit**

```bash
git add docs/ENGINE.md
git commit -m "docs(engine): clarify lock delay reset on line clear, fix counter direction"
```

---

### Task 5: ENGINE.md — Edge case clarifications (changes 8, 9, 10, 12)

**Files:**
- Modify: `docs/ENGINE.md` (multiple sections)

**Step 1: Add O-piece lastKickIndex note**

After line 392 (end of O Piece Offset Table code block `];`), add:

```

> **Note:** O-piece does not use wall kicks (only 1 test per rotation). After any O-piece rotation, `lastKickIndex` is set to `0`.
```

**Step 2: Add practice mode pause note**

After line 689 (practice mode timer description), add:

```
   - **Pause behavior:** When paused, `remainingMs` does not decrement. The timer freezes and resumes from the same value on unpause.
```

**Step 3: Clarify spawn collision**

Replace line 693:
```
7. If new piece cannot spawn (collision at spawn position): game over with `reason: 'topout'`.
```

With:
```
7. If new piece cannot spawn (any block of the new piece overlaps an occupied cell at spawn position row 18): game over with `reason: 'topout'`. The colliding piece is not placed on the grid.
```

**Step 4: Mark fromSnapshot as future**

Replace lines 718-723:
```
#### `static fromSnapshot(snapshot: GameSnapshot, eventBus: EventBus): GameEngine`

Reconstructs a `GameEngine` from a serialized snapshot. Used for:
- Server reconciliation in multiplayer.
- Replay/spectator mode.
- Save/load game state.
```

With:
```
#### `static fromSnapshot(snapshot: GameSnapshot, eventBus: EventBus): GameEngine`

*(Future feature — not implemented in initial release.)*

Reconstructs a `GameEngine` from a serialized snapshot. Used for:
- Server reconciliation in multiplayer.
- Replay/spectator mode.
- Save/load game state.
```

**Step 5: Commit**

```bash
git add docs/ENGINE.md
git commit -m "docs(engine): add O-piece kick note, pause timer, spawn collision, fromSnapshot future flag"
```

---

### Task 6: RENDERER.md — Canvas dimensions and popup duration (changes 13, 14)

**Files:**
- Modify: `docs/RENDERER.md:281-283` (Hold and Next Queue section)

**Step 1: Add canvas dimension spec**

Replace lines 281-283:
```
### Hold and Next Queue

Hold piece and next queue are drawn on **separate small canvases** (not the main playfield canvas). They only re-render when the held piece or next queue changes, not every frame.
```

With:
```
### Hold and Next Queue

Hold piece and next queue are drawn on **separate small canvases** (not the main playfield canvas). They only re-render when the held piece or next queue changes, not every frame.

**Canvas dimensions:**
- **Hold piece:** `4 × cellSize` wide by `3 × cellSize` tall (accommodates all piece shapes centered in their bounding box).
- **Next queue:** `4 × cellSize` wide by `(3 × cellSize × 5) + (gap × 4)` tall, where `gap = cellSize × 0.5`. Each preview piece is centered within its `4 × 3` cell area.
```

**Step 2: Add text popup duration**

After line 231 (end of TextPopup interface), add:

```

### Default Duration

Text popup default display duration: **2000ms**. Breakdown: fade-in 100ms, hold 1600ms, float-up + fade-out 300ms.
```

**Step 3: Commit**

```bash
git add docs/RENDERER.md
git commit -m "docs(renderer): add hold/next canvas dimensions, text popup duration"
```

---

### Task 7: RENDERER.md — Lock flash, gradient, garbage color (changes 15, 16, 17)

**Files:**
- Modify: `docs/RENDERER.md` (multiple sections)

**Step 1: Add lock flash spec**

After line 13 (end of render pipeline list item 5), add:

```

### Lock Flash

When a piece locks, all cells of the locked piece flash white at `rgba(255, 255, 255, 0.6)` for 100ms (rendered as a single-frame overlay on top of the normal block), then return to standard block rendering. This is a brief visual confirmation, not an animation — it renders for one frame then clears.
```

**Step 2: Clarify bevel gradient midpoint**

Replace lines 29-32:
```
2. **Center face gradient:** Draw the inner rectangle (inset by bevel width) with a vertical linear gradient:
   - Top: `rgba(255, 255, 255, 0.15)` (lighter)
   - Middle: `rgba(255, 255, 255, 0.0)` (neutral)
   - Bottom: `rgba(0, 0, 0, 0.1)` (slightly darker)
```

With:
```
2. **Center face gradient:** Draw the inner rectangle (inset by bevel width) with a vertical linear gradient from `y = bevelWidth` to `y = cellSize - bevelWidth`:
   - Top (0%): `rgba(255, 255, 255, 0.15)` (lighter)
   - Middle (50%): `rgba(255, 255, 255, 0.0)` (neutral)
   - Bottom (100%): `rgba(0, 0, 0, 0.1)` (slightly darker)
```

**Step 3: Add garbage block color**

After line 100 (end of BOARD_COLORS), add to the BOARD_COLORS object and add a note:

Replace:
```
const BOARD_COLORS = {
  background: '#0A0A12',                    // Very dark blue-black
  gridLine: 'rgba(255, 255, 255, 0.06)',    // Subtle grid lines
  gridBorder: '#1A1A2E',                    // Border around playfield
  ghostPieceAlpha: 0.2,                     // Ghost piece transparency
};
```

With:
```
const BOARD_COLORS = {
  background: '#0A0A12',                    // Very dark blue-black
  gridLine: 'rgba(255, 255, 255, 0.06)',    // Subtle grid lines
  gridBorder: '#1A1A2E',                    // Border around playfield
  ghostPieceAlpha: 0.2,                     // Ghost piece transparency
  garbage: '#8A8A8A',                       // Medium gray (for future garbage rows)
};
```

**Step 4: Commit**

```bash
git add docs/RENDERER.md
git commit -m "docs(renderer): add lock flash spec, clarify gradient midpoint, add garbage color"
```

---

### Task 8: INPUT.md — Pause, blur/focus, animation input (changes 18, 19, 20)

**Files:**
- Modify: `docs/INPUT.md` (add new sections after line 264)

**Step 1: Add three new sections**

After line 265 (`4. DAS state is cleared on detach to prevent stuck keys.`), add:

```

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
```

**Step 2: Commit**

```bash
git add docs/INPUT.md
git commit -m "docs(input): add pause/game-over, blur/focus, and animation input specs"
```

---

### Task 9: UI.md — Overlay behavior, hook API, cleanup, task scope (changes 21, 22, 23, 24)

**Files:**
- Modify: `docs/UI.md` (multiple sections)

**Step 1: Add overlay behavior note**

After line 59 (`{isGameOver && <GameOverScreen />}`), add:

```

### Overlay Behavior

- **Pause overlay:** Renders on top of the frozen canvas (canvas stops updating while paused). Blocks all game input. Menu buttons (Resume, Restart, Quit) are clickable.
- **Game over overlay:** Renders on top of the final game state. Blocks all game input. Menu buttons (Play Again, Main Menu) are clickable.
```

**Step 2: Fix useGameSession return API**

Replace lines 142-147:
```
  return {
    gameState,
    pause: () => session.pause(),
    resume: () => session.resume(),
    restart: () => session.restart(),
  };
```

With:
```
  // Wrap session methods in stable callbacks (session is not exposed directly)
  const pause = useCallback(() => sessionRef.current?.pause(), []);
  const resume = useCallback(() => sessionRef.current?.resume(), []);
  const restart = useCallback(() => sessionRef.current?.restart(), []);
  const quit = useCallback(() => sessionRef.current?.destroy(), []);

  return { gameState, pause, resume, restart, quit };
```

**Step 3: Add cleanup spec**

After line 166 (end of Throttling section), add:

```

### Cleanup

`GameSession.destroy()` performs the following cleanup chain:
1. Stops the `GameLoop` (cancels the `requestAnimationFrame` callback).
2. Calls `KeyboardManager.detach()` (removes DOM event listeners, clears DAS state).
3. Calls `GameRenderer.destroy()` (releases `OffscreenCanvas` caches).
4. Calls `EventBus.removeAllListeners()` (prevents stale callbacks).
```

**Step 4: Add task scope clarification**

After line 277 (end of ComboPopup description), add:

```

### Task Scope

- **Task 5.2 (HUD Components):** ScoreDisplay, LevelDisplay, LinesDisplay, HoldPiece, NextQueue.
- **Task 5.8 (Timer Display):** TimerDisplay (practice mode only).
```

**Step 5: Commit**

```bash
git add docs/UI.md
git commit -m "docs(ui): add overlay behavior, fix hook API, add cleanup spec, clarify task scope"
```

---

### Task 10: ARCHITECTURE.md — Error handling, cleanup, pause semantics (changes 25, 26, 27)

**Files:**
- Modify: `docs/ARCHITECTURE.md` (add new section before "Multiplayer Readiness")

**Step 1: Add three new sections**

Before line 234 (`## Multiplayer Readiness`), add:

```
## Error Handling

- **Spawn collision:** When a newly spawned piece overlaps occupied cells, the engine emits a `GAME_OVER` event with `reason: 'topout'`. This is the standard game-over path, not an error.
- **Renderer errors:** If the renderer throws during `draw()`, the error is caught and logged to `console.error`. The game loop continues — a single dropped frame is preferable to a crash.
- **localStorage failures:** If `localStorage` is unavailable or full (e.g., private browsing mode), settings and personal bests fall back to defaults silently. No error UI is shown.

## Resource Cleanup

`GameSession.destroy()` follows this cleanup chain:

```
GameSession.destroy()
  ├─ GameLoop.stop()           — cancels requestAnimationFrame
  ├─ KeyboardManager.detach()  — removes DOM listeners, clears DAS state
  ├─ GameRenderer.destroy()    — releases OffscreenCanvas caches
  └─ EventBus.removeAllListeners()  — prevents stale callbacks
```

This chain is called by the `useGameSession` cleanup effect on unmount, ensuring no memory leaks on game restart or navigation.

## Pause Semantics

When paused:
- `engine.tick(deltaMs)` is a no-op: gravity, lock delay, and practice timer are all frozen.
- `engine.applyAction()` ignores all actions except `PAUSE` (to unpause).
- `KeyboardManager` is detached (no key events processed).
- Snapshots reflect the frozen state — the renderer draws the last frame before pause.
- When resumed, all timers resume from where they paused (accumulated time is preserved, not reset).

```

**Step 2: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs(arch): add error handling, resource cleanup, and pause semantics sections"
```

---

### Task 11: Final review and verify

**Step 1: Verify no broken markdown**

Open each modified file and scan for formatting issues:
- `docs/ENGINE.md`
- `docs/RENDERER.md`
- `docs/INPUT.md`
- `docs/UI.md`
- `docs/ARCHITECTURE.md`

**Step 2: Verify cross-references are consistent**

Check that:
- ScoreManager API in ENGINE.md matches the scoring formula section
- ARCHITECTURE.md cleanup chain matches UI.md cleanup spec
- INPUT.md pause behavior matches ARCHITECTURE.md pause semantics

**Step 3: Commit any formatting fixes**

```bash
git add docs/
git commit -m "docs: final formatting pass after audit fixes"
```
