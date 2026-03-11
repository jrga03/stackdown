# Implementation Tasks

Granular task breakdown organized by phase. Each task lists dependencies, files to create/modify, and testable acceptance criteria.

---

## Phase 1: Foundation

### Task 1.1: Project Scaffold

**Description:** Initialize the project with Vite, React, and TypeScript. Set up the directory structure and configuration files.

**Dependencies:** None

**Files to create:**
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`

**Acceptance criteria:**
- [ ] `npm install` succeeds without errors
- [ ] `npm run dev` starts the Vite dev server and renders a blank React app
- [ ] `npm run build` produces a production build without TypeScript errors
- [ ] TypeScript strict mode is enabled

---

### Task 1.2: Type Definitions and Constants

**Description:** Define all shared types, enums, and constants for the engine module.

**Dependencies:** Task 1.1

**Files to create:**
- `src/engine/types.ts`
- `src/engine/constants.ts`

**Acceptance criteria:**
- [ ] `PieceType` enum has all 7 values: I, O, T, S, Z, J, L
- [ ] `RotationState` enum has 4 values: SPAWN=0, RIGHT=1, FLIP=2, LEFT=3
- [ ] `GameAction` enum has 9 values: MOVE_LEFT, MOVE_RIGHT, SOFT_DROP, HARD_DROP, ROTATE_CW, ROTATE_CCW, ROTATE_180, HOLD, PAUSE
- [ ] `GameEventType` enum has all 13 event types
- [ ] `Cell`, `Grid`, `Position`, `ActivePieceState`, `GameSnapshot` types are defined
- [ ] `EventMap` type maps each event type to its payload shape
- [ ] Constants defined: BOARD_WIDTH=10, BOARD_HEIGHT=40, VISIBLE_HEIGHT=20, SPAWN_ROW=18, LOCK_DELAY_MS=500, MAX_LOCK_RESETS=15
- [ ] Gravity timing table has 15 entries
- [ ] Scoring base points table covers all actions (single through T-Spin Triple, including minis)
- [ ] Lines-per-level table is defined (5/5/5/5/5/10/10/10/10/10/15/15/15/15/15)
- [ ] All types compile without errors

---

### Task 1.3: Piece Shapes

**Description:** Define all 7 tetromino shapes in all 4 rotation states as coordinate arrays.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/Piece.ts`

**Acceptance criteria:**
- [ ] Each piece type has exactly 4 rotation states
- [ ] Each rotation state has the correct number of blocks (4 blocks per piece)
- [ ] I piece uses a 4x4 bounding box
- [ ] O piece uses a 2x2 bounding box (same shape in all 4 states)
- [ ] T, S, Z, J, L pieces use a 3x3 bounding box
- [ ] Visual verification: printing each state to console matches the expected ASCII art from ENGINE.md
- [ ] `getBlocks(type, rotation)` returns the correct `Position[]` for any type+rotation combination

---

### Task 1.4: Board

**Description:** Implement the board (10x40 grid) with collision detection and line clearing.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/Board.ts`
- `src/engine/__tests__/Board.test.ts`

**Acceptance criteria:**
- [ ] Board initializes as a 40-row x 10-column grid of nulls
- [ ] `isValidPosition(blocks)` returns `true` for positions within bounds and on empty cells
- [ ] `isValidPosition(blocks)` returns `false` for positions out of bounds (left, right, bottom)
- [ ] `isValidPosition(blocks)` returns `false` for positions overlapping occupied cells
- [ ] `lockPiece(blocks, type)` writes the piece type into the grid at the given positions
- [ ] `clearFullRows()` removes completely filled rows and shifts rows above down
- [ ] `clearFullRows()` returns the indices of cleared rows (in original positions)
- [ ] Clearing 1, 2, 3, and 4 rows simultaneously works correctly
- [ ] Clearing rows at the bottom of the board works correctly
- [ ] `getCell(row, col)` returns the correct cell value
- [ ] All tests pass

---

### Task 1.5: SRS (Super Rotation System)

**Description:** Implement SRS rotation with wall kick offset tables for all piece categories.

**Dependencies:** Task 1.2, Task 1.3, Task 1.4

**Files to create:**
- `src/engine/SRS.ts`
- `src/engine/__tests__/SRS.test.ts`

**Acceptance criteria:**
- [ ] JLSTZ offset table matches the values in ENGINE.md exactly
- [ ] I piece offset table matches the values in ENGINE.md exactly
- [ ] O piece offset table matches the values in ENGINE.md exactly
- [ ] `tryRotation(board, piece, direction)` tests up to 5 kick positions for JLSTZ/I pieces
- [ ] Rotation succeeds at the first valid kick position and returns the kick index
- [ ] Rotation fails (returns null) if all 5 tests are invalid
- [ ] CW rotation: SPAWN→RIGHT→FLIP→LEFT→SPAWN
- [ ] CCW rotation: SPAWN→LEFT→FLIP→RIGHT→SPAWN
- [ ] 180 rotation changes state by 2 (SPAWN→FLIP, RIGHT→LEFT, etc.)
- [ ] Wall kicks correctly allow T-spins, I-piece wall kicks, and floor kicks
- [ ] Tests cover at least: basic rotation on empty board, wall kicks against left/right walls, floor kicks, rotation blocked by occupied cells

---

### Task 1.6: Randomizer (7-Bag)

**Description:** Implement the 7-bag randomizer with optional seeded PRNG.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/Randomizer.ts`
- `src/engine/__tests__/Randomizer.test.ts`

**Acceptance criteria:**
- [ ] Each bag contains exactly one of each piece type (7 unique pieces)
- [ ] `next()` returns pieces in shuffled order
- [ ] `next()` automatically generates a new bag when the current bag is exhausted
- [ ] `peek(n)` returns the next N pieces without consuming them
- [ ] After `peek(5)`, calling `next()` returns the same piece that was first in the peek
- [ ] Queue is pre-filled with at least 14 pieces (2 bags)
- [ ] Seeded randomizer produces the same sequence given the same seed
- [ ] Different seeds produce different sequences
- [ ] Unseeded randomizer produces varied sequences across instances
- [ ] All tests pass

---

### Task 1.7: EventBus

**Description:** Implement a typed event emitter for game events.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/EventBus.ts`

**Acceptance criteria:**
- [ ] `on(event, callback)` subscribes to an event and returns an unsubscribe function
- [ ] `emit(event, payload)` calls all subscribed callbacks with the payload
- [ ] Calling the unsubscribe function removes the callback
- [ ] `removeAllListeners()` clears all subscriptions
- [ ] Multiple listeners for the same event all receive the payload
- [ ] Type safety: TypeScript enforces correct payload type for each event

---

## Phase 2: Engine Core

### Task 2.1: GravityTimer

**Description:** Implement gravity timing that drops pieces at level-appropriate speeds.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/GravityTimer.ts`

**Acceptance criteria:**
- [ ] `getIntervalForLevel(level)` returns the correct ms/cell for levels 1-15 per the gravity table
- [ ] `tick(deltaMs, level)` accumulates time and returns the number of cells to drop
- [ ] At level 1 (1000ms), calling tick(1000) returns 1
- [ ] At level 1, calling tick(500) returns 0, then tick(500) returns 1
- [ ] At high levels (e.g., level 15 = 7ms), multiple drops can occur in a single tick
- [ ] `reset()` clears the accumulator

---

### Task 2.2: LockDelay

**Description:** Implement lock delay with move resets.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/LockDelay.ts`

**Acceptance criteria:**
- [ ] Timer starts at 500ms when `start()` is called
- [ ] `tick(deltaMs)` counts down and returns `true` when timer reaches 0
- [ ] `reset()` resets timer to 500ms and returns `true` if resets remain
- [ ] `reset()` returns `false` after 15 resets have been used
- [ ] `isActive()` returns `true` only after `start()` and before lock or deactivate
- [ ] `deactivate()` stops the timer (piece moved off surface)

---

### Task 2.3: TSpinDetector

**Description:** Implement T-Spin detection using the 3-corner rule.

**Dependencies:** Task 1.2, Task 1.4

**Files to create:**
- `src/engine/TSpinDetector.ts`
- `src/engine/__tests__/TSpinDetector.test.ts`

**Acceptance criteria:**
- [ ] Returns "none" for non-T pieces
- [ ] Returns "none" if last action was not a rotation
- [ ] Returns "none" if fewer than 3 corners are occupied
- [ ] Returns "proper" T-Spin if 3+ corners filled and both front corners are filled
- [ ] Returns "mini" T-Spin if 3+ corners filled and only one front corner is filled
- [ ] Returns "proper" T-Spin if kick index is 4 (regardless of front corners)
- [ ] Correctly identifies front corners for each rotation state (Spawn, Right, Flip, Left)
- [ ] Out-of-bounds positions (walls, floor) count as occupied corners
- [ ] Above-board positions (y < 0) count as NOT occupied
- [ ] Tests cover: proper T-Spin, T-Spin Mini, no T-Spin, kick-index-4 T-Spin

---

### Task 2.4: ScoreManager

**Description:** Implement scoring with base points, level multiplier, back-to-back, combo, and drop points.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/ScoreManager.ts`
- `src/engine/__tests__/ScoreManager.test.ts`

**Acceptance criteria:**
- [ ] Single clear at level 1 awards 100 points
- [ ] Double clear at level 1 awards 300 points
- [ ] Triple clear at level 1 awards 500 points
- [ ] Quad at level 1 awards 800 points
- [ ] T-Spin Double at level 1 awards 1200 points
- [ ] T-Spin Mini Single at level 1 awards 200 points
- [ ] All base points are multiplied by the current level
- [ ] Back-to-back Quad: second consecutive Quad awards `floor(800 * 1.5)` = 1200 at level 1
- [ ] Back-to-back resets on a non-difficult clear (Single, Double, Triple without T-Spin)
- [ ] Back-to-back does NOT reset on non-clearing piece lock
- [ ] Combo bonus: `50 × combo × level` for combo > 0
- [ ] Combo resets to -1 when a piece locks without clearing lines
- [ ] Soft drop awards 1 point per cell
- [ ] Hard drop awards 2 points per cell
- [ ] Drop points are NOT multiplied by level
- [ ] Level advances after clearing the required number of lines (5 for levels 1-5, 10 for 6-10, 15 for 11-15)
- [ ] All tests pass

---

### Task 2.5: ComboTracker

**Description:** Implement combo counter logic.

**Dependencies:** Task 1.2

**Files to create:**
- `src/engine/ComboTracker.ts`

**Acceptance criteria:**
- [ ] Starts at -1 (no active combo)
- [ ] Increments by 1 on each consecutive line clear
- [ ] Resets to -1 when a piece locks without clearing
- [ ] `getCombo()` returns current combo count
- [ ] After 3 consecutive clears, combo is 2 (started at -1, then 0, 1, 2)

---

### Task 2.6: GameEngine

**Description:** Implement the main `GameEngine` class that orchestrates all engine subsystems.

**Dependencies:** Task 1.3, Task 1.4, Task 1.5, Task 1.6, Task 1.7, Task 2.1, Task 2.2, Task 2.3, Task 2.4, Task 2.5

**Files to create:**
- `src/engine/GameEngine.ts`
- `src/engine/GameState.ts`
- `src/engine/ActivePiece.ts`
- `src/engine/__tests__/GameEngine.test.ts`

**Acceptance criteria:**
- [ ] Constructor creates a new game with empty board, spawns first piece, fills next queue
- [ ] `tick(deltaMs)` advances gravity and lock delay; no-op when paused or game over
- [ ] `applyAction(MOVE_LEFT)` moves piece left if valid
- [ ] `applyAction(MOVE_RIGHT)` moves piece right if valid
- [ ] `applyAction(SOFT_DROP)` moves piece down 1 cell and awards 1 drop point
- [ ] `applyAction(HARD_DROP)` drops piece to lowest position, awards 2 points per cell, locks immediately
- [ ] `applyAction(ROTATE_CW)` rotates clockwise with wall kicks
- [ ] `applyAction(ROTATE_CCW)` rotates counter-clockwise with wall kicks
- [ ] `applyAction(HOLD)` swaps active piece with hold (or holds current and spawns next)
- [ ] `applyAction(HOLD)` is rejected if hold was already used this piece
- [ ] `applyAction(PAUSE)` toggles pause state
- [ ] `getSnapshot()` returns a complete `GameSnapshot` with all fields populated
- [ ] Game over triggers when a new piece cannot spawn (collision at spawn position)
- [ ] After piece locks, full rows are cleared and score is updated
- [ ] After line clear, events are emitted (LINE_CLEAR, COMBO, BACK_TO_BACK, LEVEL_UP as applicable)
- [ ] Lock delay activates when piece lands on surface, resets on move/rotate
- [ ] Ghost piece position is calculated correctly (lowest valid Y for current piece)
- [ ] All tests pass

---

### Task 2.7: Engine Barrel Export

**Description:** Create the engine's public API barrel file.

**Dependencies:** Task 2.6

**Files to create:**
- `src/engine/index.ts`

**Acceptance criteria:**
- [ ] Exports `GameEngine`, `EventBus`, all types, all enums, and all constants needed by external modules
- [ ] External modules can import from `'../engine'` without reaching into internal files

---

## Phase 3: Rendering

### Task 3.1: Color Palette

**Description:** Define the color constants for pieces and board.

**Dependencies:** Task 1.2

**Files to create:**
- `src/renderer/colors.ts`

**Acceptance criteria:**
- [ ] `PIECE_COLORS` maps each `PieceType` to its hex color (I=#00E5FF, O=#FFD600, T=#AA00FF, S=#00E676, Z=#FF1744, J=#2979FF, L=#FF9100)
- [ ] `BOARD_COLORS` includes background (#0A0A12), gridLine (rgba 0.06), gridBorder (#1A1A2E), ghostPieceAlpha (0.2)

---

### Task 3.2: BlockRenderer

**Description:** Implement the bevel-shaded block rendering.

**Dependencies:** Task 3.1

**Files to create:**
- `src/renderer/BlockRenderer.ts`

**Acceptance criteria:**
- [ ] `drawBlock(ctx, x, y, cellSize, color)` draws a single block with bevel shading
- [ ] Block has base fill, center gradient, 4 bevel trapezoids, specular highlight, and outer border
- [ ] Bevel ratio is 0.15 of cell size
- [ ] Top/left bevels are light (highlights), bottom/right bevels are dark (shadows)
- [ ] Specular dot is positioned at top-left of cell (0.28, 0.28)
- [ ] Outer border uses 0.5px offset for crisp lines
- [ ] Visual verification: rendered block has a convincing 3D beveled appearance

---

### Task 3.3: BoardRenderer

**Description:** Implement grid background rendering with OffscreenCanvas caching.

**Dependencies:** Task 3.1

**Files to create:**
- `src/renderer/BoardRenderer.ts`

**Acceptance criteria:**
- [ ] Grid cache uses `OffscreenCanvas` (with `HTMLCanvasElement` fallback for environments that don't support it)
- [ ] Grid cache is only regenerated when dimensions change
- [ ] Grid includes: background fill, vertical lines (11), horizontal lines (21), outer border
- [ ] Grid lines use `BOARD_COLORS.gridLine` color
- [ ] `drawCachedGrid(ctx)` blits the cached grid to the main canvas

---

### Task 3.4: PieceRenderer

**Description:** Implement rendering for the active piece, ghost piece, and piece previews.

**Dependencies:** Task 3.2, Task 1.3

**Files to create:**
- `src/renderer/PieceRenderer.ts`

**Acceptance criteria:**
- [ ] Active piece renders all 4 blocks using `BlockRenderer.drawBlock` at the correct grid positions
- [ ] Ghost piece renders with alpha=0.2 and a 1.5px outline at piece color with alpha=0.5
- [ ] `drawPiecePreview(ctx, type, cellSize)` renders a centered piece (for hold and next queue)
- [ ] Piece positions are correctly translated from grid coordinates to pixel coordinates
- [ ] Only visible-area blocks are rendered (y >= 20 in the 40-row grid)

---

### Task 3.5: AnimationManager

**Description:** Implement line clear animations and lock flash.

**Dependencies:** Task 3.1, Task 1.7

**Files to create:**
- `src/renderer/AnimationManager.ts`

**Acceptance criteria:**
- [ ] Subscribes to `LINE_CLEAR` event on the EventBus
- [ ] Stores cleared row data (cell types) separately from the board grid
- [ ] Flash phase (0-150ms): white rectangle expands from center, opacity decreases from 0.8
- [ ] Dissolve phase (150-400ms): blocks shrink toward center, fade to transparent, drawn white
- [ ] Rows above cleared lines don't visually collapse until animation completes
- [ ] `update(deltaMs)` advances all active animations
- [ ] `draw(ctx, cellSize)` renders all active animations
- [ ] Completed animations are automatically removed

---

### Task 3.6: TextPopup

**Description:** Implement floating text popups for scoring actions.

**Dependencies:** Task 3.1, Task 1.7

**Files to create:**
- `src/renderer/TextPopup.ts`

**Acceptance criteria:**
- [ ] Subscribes to `LINE_CLEAR`, `TSPIN`, `COMBO`, `BACK_TO_BACK` events
- [ ] Pop-in phase (0-15%): scale 0→1.2
- [ ] Settle phase (15-25%): scale 1.2→1.0
- [ ] Normal phase (25-70%): scale 1.0
- [ ] Fade out phase (70-100%): alpha 1.0→0.0
- [ ] Text floats upward at configured speed
- [ ] Text has dark outline (4 offset draws) for readability
- [ ] Quad text is yellow, T-Spin text is purple, combo text is white
- [ ] Completed popups are automatically removed

---

### Task 3.7: GameRenderer

**Description:** Implement the main render orchestrator that coordinates all sub-renderers.

**Dependencies:** Task 3.3, Task 3.4, Task 3.5, Task 3.6

**Files to create:**
- `src/renderer/GameRenderer.ts`
- `src/renderer/types.ts`
- `src/renderer/index.ts`

**Acceptance criteria:**
- [ ] Constructor takes an `HTMLCanvasElement` and creates the 2D context with `{ alpha: false }`
- [ ] `resize(width, height)` recalculates cell size and regenerates grid cache
- [ ] `draw(snapshot, interpolation)` renders a complete frame in correct order: grid → locked blocks → ghost → active piece → effects
- [ ] Active piece Y is interpolated for smooth gravity between ticks
- [ ] `destroy()` releases cached canvases
- [ ] Only the visible 20 rows are rendered (buffer zone rows are skipped)

---

## Phase 4: Input + Game Loop

### Task 4.1: InputMapper

**Description:** Map keyboard codes to game actions.

**Dependencies:** Task 1.2

**Files to create:**
- `src/input/InputMapper.ts`
- `src/input/types.ts`

**Acceptance criteria:**
- [ ] Default bindings match the key binding table in INPUT.md
- [ ] `mapKey(code)` returns the correct `GameAction` or `null` for unmapped keys
- [ ] `updateBindings(bindings)` reconfigures the mapping
- [ ] Uses `KeyboardEvent.code` (not `.key`) for layout-independent mapping

---

### Task 4.2: DASManager

**Description:** Implement Delayed Auto-Shift and Auto-Repeat Rate for movement actions.

**Dependencies:** Task 1.2

**Files to create:**
- `src/input/DASManager.ts`

**Acceptance criteria:**
- [ ] On key press: fires action immediately, starts DAS charge at 0
- [ ] After DAS delay (167ms default): enters auto-repeat mode
- [ ] In auto-repeat: fires action every ARR interval (33ms default)
- [ ] On key release: resets all state
- [ ] Left/right direction priority: most recently pressed direction wins when both held
- [ ] Soft drop DAS/ARR works independently from horizontal movement
- [ ] If ARR=0 (instant DAS): fires BOARD_WIDTH actions when DAS charges
- [ ] `update(deltaMs)` returns array of actions to apply this tick

---

### Task 4.3: KeyboardManager

**Description:** Handle keyboard events, reject OS repeat, and coordinate InputMapper + DASManager.

**Dependencies:** Task 4.1, Task 4.2

**Files to create:**
- `src/input/KeyboardManager.ts`
- `src/input/index.ts`

**Acceptance criteria:**
- [ ] OS key repeats (`e.repeat === true`) are rejected
- [ ] `e.preventDefault()` is called for mapped keys (prevents scrolling on arrows, etc.)
- [ ] Immediate actions (rotate, hard drop, hold, pause) fire directly via callback
- [ ] DAS-processed actions (left, right, soft drop) go through DASManager
- [ ] `attach()` adds keydown/keyup listeners to window
- [ ] `detach()` removes listeners and clears DAS state
- [ ] No stuck keys after detach (DAS state is fully reset)

---

### Task 4.4: GameLoop

**Description:** Implement fixed-timestep game loop using `requestAnimationFrame`.

**Dependencies:** None (uses engine and renderer interfaces)

**Files to create:**
- `src/game/GameLoop.ts`

**Acceptance criteria:**
- [ ] Uses `requestAnimationFrame` for the animation loop
- [ ] Fixed timestep: logic ticks at ~60/second (16.667ms per tick)
- [ ] Accumulator pattern: accumulates frame deltaMs, processes fixed-size ticks
- [ ] Frame time clamped to 250ms maximum (prevents spiral of death on tab background)
- [ ] Interpolation factor (`accumulator / TICK_MS`) is passed to the render callback
- [ ] `start()` begins the loop, `stop()` cancels it
- [ ] Calling `start()` when already running is a no-op

---

### Task 4.5: GameSession

**Description:** Connect engine, renderer, input, and React into a playable game session.

**Dependencies:** Task 2.7, Task 3.7, Task 4.3, Task 4.4

**Files to create:**
- `src/game/GameSession.ts`

**Acceptance criteria:**
- [ ] Constructor takes an `HTMLCanvasElement` and creates engine, renderer, input, and game loop
- [ ] Each game loop tick: processes DAS actions → `engine.tick()` → `renderer.draw()`
- [ ] Input callback routes actions to `engine.applyAction()`
- [ ] `onStateUpdate(callback)` registers a throttled state callback (~10fps / 100ms interval)
- [ ] `start()` begins the game loop and attaches keyboard listeners
- [ ] `destroy()` stops the loop, detaches input, and cleans up renderer
- [ ] `pause()`, `resume()`, `restart()` methods work correctly
- [ ] **The game is fully playable at this point** — pieces fall, move, rotate, lock, lines clear, score tracks

---

## Phase 5: React UI

### Task 5.1: GameScreen and useGameSession

**Description:** Create the main game screen component and the hook that bridges GameSession to React.

**Dependencies:** Task 4.5

**Files to create:**
- `src/ui/screens/GameScreen.tsx`
- `src/hooks/useGameSession.ts`

**Acceptance criteria:**
- [ ] `GameScreen` renders a `<canvas>` element with a ref
- [ ] `useGameSession` creates a `GameSession` from the canvas ref
- [ ] State updates from engine are received at ~10fps via throttled callback
- [ ] `gameState` includes: score, level, linesCleared, holdPiece, nextQueue, isPaused, isGameOver, combo, backToBack
- [ ] Session is destroyed on component unmount (cleanup in useEffect)
- [ ] Canvas renders the game (pieces fall, player can interact)

---

### Task 5.2: HUD Components

**Description:** Create the HUD components for score, level, lines, hold piece, and next queue.

**Dependencies:** Task 5.1, Task 3.4

**Files to create:**
- `src/ui/hud/ScoreDisplay.tsx`
- `src/ui/hud/LevelDisplay.tsx`
- `src/ui/hud/LinesDisplay.tsx`
- `src/ui/hud/HoldPiece.tsx`
- `src/ui/hud/NextQueue.tsx`
- `src/ui/hud/HUD.tsx`

**Acceptance criteria:**
- [ ] `ScoreDisplay` shows current score formatted with locale separators
- [ ] `LevelDisplay` shows current level
- [ ] `LinesDisplay` shows total lines cleared
- [ ] `HoldPiece` renders the held piece on a separate small canvas; empty state shows nothing
- [ ] `HoldPiece` only re-renders when the held piece type changes
- [ ] `NextQueue` renders the next 5 pieces on a separate small canvas
- [ ] `NextQueue` only re-renders when the queue contents change
- [ ] `HUD` composes all display components in the correct layout

---

### Task 5.3: Game Layout

**Description:** Implement the three-column game layout with side panels.

**Dependencies:** Task 5.1, Task 5.2

**Files to modify:**
- `src/ui/screens/GameScreen.tsx`

**Acceptance criteria:**
- [ ] Layout: left panel (hold) | center (playfield canvas) | right panel (next queue, score, level, lines)
- [ ] Canvas size is computed from window height for responsive fit
- [ ] Cell size is a whole number (floor of available height / 20)
- [ ] Layout is centered on screen with appropriate gaps

---

### Task 5.4: MainMenu

**Description:** Create the title screen / main menu.

**Dependencies:** Task 1.1

**Files to create:**
- `src/ui/screens/MainMenu.tsx`
- `src/ui/common/Button.tsx`

**Acceptance criteria:**
- [ ] Displays game title "STACKDOWN"
- [ ] "PLAY" button navigates to the game screen
- [ ] "SETTINGS" button navigates to the settings screen
- [ ] Buttons are styled consistently and have hover/active states

---

### Task 5.5: PauseOverlay and GameOverScreen

**Description:** Create overlay screens for pause and game over states.

**Dependencies:** Task 5.1, Task 5.4

**Files to create:**
- `src/ui/screens/PauseOverlay.tsx`
- `src/ui/screens/GameOverScreen.tsx`

**Acceptance criteria:**
- [ ] `PauseOverlay` appears as a semi-transparent overlay on top of the game canvas
- [ ] Pause overlay has "RESUME", "RESTART", and "QUIT" buttons
- [ ] `GameOverScreen` displays final score, level, and lines
- [ ] Game over screen has "PLAY AGAIN" and "MAIN MENU" buttons
- [ ] Pressing Escape during gameplay shows the pause overlay
- [ ] Pressing Escape on the pause overlay resumes the game

---

### Task 5.6: App Screen Router

**Description:** Implement screen navigation in the root App component.

**Dependencies:** Task 5.4, Task 5.5, Task 5.1

**Files to modify:**
- `src/App.tsx`

**Acceptance criteria:**
- [ ] App manages `screen` state: 'menu' | 'game' | 'settings'
- [ ] MainMenu → GameScreen transition works
- [ ] GameScreen → MainMenu transition works (via pause quit or game over)
- [ ] MainMenu → SettingsScreen → MainMenu navigation works
- [ ] Game over "Play Again" starts a new game
- [ ] Game over "Main Menu" returns to menu

---

## Phase 6: Polish

### Task 6.1: ParticleSystem

**Description:** Add particle effects for hard drops and line clears.

**Dependencies:** Task 3.5

**Files to create:**
- `src/renderer/ParticleSystem.ts`

**Acceptance criteria:**
- [ ] Hard drop impact spawns particles at the landing position
- [ ] Line clear spawns particles across cleared rows
- [ ] Particles have velocity, gravity, alpha decay, and finite lifetime
- [ ] `update(deltaMs)` advances particle physics
- [ ] `draw(ctx)` renders all active particles
- [ ] Dead particles are automatically removed

---

### Task 6.2: SettingsScreen

**Description:** Create the settings UI for key bindings and DAS/ARR configuration.

**Dependencies:** Task 5.4

**Files to create:**
- `src/ui/screens/SettingsScreen.tsx`
- `src/ui/settings/KeyBindings.tsx`
- `src/ui/settings/GameSettings.tsx`
- `src/hooks/useSettings.ts`

**Acceptance criteria:**
- [ ] Key bindings display current mapping and allow rebinding by pressing a new key
- [ ] DAS delay is configurable (slider or input, 50-300ms range)
- [ ] ARR interval is configurable (slider or input, 0-100ms range)
- [ ] Settings are persisted to `localStorage`
- [ ] Settings survive page reload
- [ ] "Reset to Defaults" button restores all settings to their defaults
- [ ] Settings are applied to the game without requiring restart

---

### Task 6.3: Responsive Canvas Sizing

**Description:** Make the game canvas resize responsively based on window dimensions.

**Dependencies:** Task 5.3

**Files to modify:**
- `src/game/GameSession.ts`
- `src/ui/screens/GameScreen.tsx`

**Acceptance criteria:**
- [ ] Canvas and cell size recalculate on window resize
- [ ] Cell size is always a whole number for crisp rendering
- [ ] Grid cache is regenerated on resize
- [ ] HUD panels adjust to available space
- [ ] Game remains playable at different window sizes (minimum viable: 800x600)

---

### Task 6.4: Audio System (Stub)

**Description:** Create the audio system interface (stubbed for future implementation).

**Dependencies:** None

**Files to create:**
- `src/audio/AudioManager.ts`
- `src/audio/sounds.ts`

**Acceptance criteria:**
- [ ] `AudioManager` class with `play(sound)`, `setVolume(v)`, `mute()`, `unmute()` methods
- [ ] Methods are no-ops (stubs) — no actual audio files or playback
- [ ] Sound enum defines: MOVE, ROTATE, LOCK, LINE_CLEAR, QUAD, TSPIN, LEVEL_UP, GAME_OVER
- [ ] Interface is ready for future implementation without requiring changes to calling code

---

### Task 6.5: Utility Functions

**Description:** Create shared utility functions.

**Dependencies:** None

**Files to create:**
- `src/utils/clamp.ts`
- `src/utils/lerp.ts`
- `src/utils/timer.ts`

**Acceptance criteria:**
- [ ] `clamp(value, min, max)` constrains a number to the given range
- [ ] `lerp(a, b, t)` linearly interpolates between a and b
- [ ] Timer utility provides simple elapsed time tracking
- [ ] All functions are pure and have no side effects

---

## Dependency Graph

```
Phase 1 (Foundation):
  1.1 ─→ 1.2 ─→ 1.3
              ─→ 1.4
              ─→ 1.6
              ─→ 1.7
         1.2 + 1.3 + 1.4 ─→ 1.5

Phase 2 (Engine):
  1.2 ─→ 2.1, 2.2, 2.4, 2.5
  1.2 + 1.4 ─→ 2.3
  1.3 + 1.4 + 1.5 + 1.6 + 1.7 + 2.1-2.5 ─→ 2.6 ─→ 2.7

Phase 3 (Rendering):
  1.2 ─→ 3.1
  3.1 ─→ 3.2 ─→ 3.3
  3.2 + 1.3 ─→ 3.4
  3.1 + 1.7 ─→ 3.5, 3.6
  3.3 + 3.4 + 3.5 + 3.6 ─→ 3.7

Phase 4 (Input + Game Loop):
  1.2 ─→ 4.1 ─→ 4.2 ─→ 4.3
  (none) ─→ 4.4
  2.7 + 3.7 + 4.3 + 4.4 ─→ 4.5  ★ GAME PLAYABLE

Phase 5 (React UI):
  4.5 ─→ 5.1 ─→ 5.2, 5.3
  1.1 ─→ 5.4
  5.1 + 5.4 ─→ 5.5
  5.1 + 5.4 + 5.5 ─→ 5.6

Phase 6 (Polish):
  3.5 ─→ 6.1
  5.4 ─→ 6.2
  5.3 ─→ 6.3
  (none) ─→ 6.4, 6.5
```

Tasks within each phase can be parallelized where dependencies allow. The critical path to a playable game runs: 1.1 → 1.2 → [1.3, 1.4, 1.6, 1.7] → 1.5 → [2.1-2.5] → 2.6 → 2.7 → [3.x, 4.1-4.4] → 4.5.
