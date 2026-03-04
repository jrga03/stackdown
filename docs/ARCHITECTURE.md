# Architecture

## Overview

Stackdown is a browser-based block-stacking game built with Canvas 2D, React, and TypeScript. The initial release includes two single-player modes: **Marathon** (15 levels, topout-based) and **Practice** (fixed gravity level, 2-minute timer). The architecture is designed for multiplayer readiness — the engine is pure TypeScript with zero browser dependencies and can run on a server.

## System Diagram

```
┌──────────────────────────────────────────────────────┐
│                     Browser                          │
│                                                      │
│  ┌────────────┐   ┌────────────┐   ┌──────────────┐ │
│  │  React UI  │   │  Renderer  │   │    Input      │ │
│  │            │   │ (Canvas 2D)│   │   System      │ │
│  │ HUD, Menus │   │ BlockRender│   │ Keyboard +    │ │
│  │ Overlays   │   │ Animations │   │ DAS/ARR       │ │
│  └─────┬──────┘   └─────┬──────┘   └──────┬───────┘ │
│        │                │                  │         │
│        │          ┌─────┴──────┐           │         │
│        │          │   Glue     │           │         │
│        └──────────┤  Layer     ├───────────┘         │
│                   │            │                     │
│                   │ GameSession│                     │
│                   │ GameLoop   │                     │
│                   └─────┬──────┘                     │
│                         │                            │
│                   ┌─────┴──────┐                     │
│                   │   Engine   │                     │
│                   │ (Pure TS)  │                     │
│                   │            │                     │
│                   │ Board, SRS │                     │
│                   │ Scoring    │                     │
│                   │ Gravity    │                     │
│                   │ EventBus   │                     │
│                   └────────────┘                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Three Layers

1. **Engine** — Pure TypeScript game logic. No DOM, no React, no browser APIs. Contains board state, piece mechanics (SRS rotation, wall kicks), scoring, gravity, lock delay, T-Spin detection, combo tracking, and an EventBus. Can run on a server for multiplayer.

2. **Renderer** — Canvas 2D drawing. Receives a `GameSnapshot` from the engine and draws the playfield, pieces, ghost piece, and visual effects (line clear animations, text popups, particles). Uses `OffscreenCanvas` for grid caching.

3. **React UI + Glue Layer** — React components for HUD (score, level, hold/next queue), menus, and overlays. The glue layer (`GameSession`, `GameLoop`) connects all three systems: it runs the game loop via `requestAnimationFrame`, feeds input actions to the engine, passes snapshots to the renderer, and throttles state updates to React at ~10fps.

## Data Flow

### Engine Tick → Snapshot → Render

```
requestAnimationFrame(callback)
  │
  ├─ GameLoop accumulates deltaMs
  │
  ├─ For each fixed tick (16.667ms):
  │     engine.tick(TICK_MS)
  │       ├─ Apply gravity
  │       ├─ Process lock delay
  │       └─ Emit events (line clear, level up, etc.)
  │
  ├─ snapshot = engine.getSnapshot()
  │
  ├─ renderer.draw(snapshot, interpolation)
  │     ├─ Draw cached grid background
  │     ├─ Draw locked blocks
  │     ├─ Draw ghost piece
  │     ├─ Draw active piece
  │     └─ Draw effects/animations
  │
  └─ Throttled: push snapshot to React (~10fps)
        └─ HUD re-renders (score, level, lines, hold, next)
```

### Input → Actions → Engine

```
Keyboard Event (keydown/keyup)
  │
  ├─ KeyboardManager filters OS repeat (e.repeat)
  │
  ├─ Maps key code to GameAction via InputMapper
  │
  ├─ Immediate actions (rotate, hard drop, hold):
  │     └─ engine.applyAction(action) immediately
  │
  └─ DAS-processed actions (left, right, soft drop):
        └─ DASManager tracks charge time
              ├─ First press: immediate action
              ├─ Hold 167ms: DAS charged
              └─ Auto-repeat every 33ms: engine.applyAction(action)
```

## Project Structure

```
stackdown/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # This file
│   ├── ENGINE.md                # Engine module spec
│   ├── RENDERER.md              # Renderer module spec
│   ├── INPUT.md                 # Input system spec
│   ├── UI.md                    # React UI spec
│   └── TASKS.md                 # Implementation task breakdown
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root React component
│   ├── engine/                  # Pure TS game engine (zero DOM imports)
│   │   ├── index.ts             # Public API barrel export
│   │   ├── constants.ts         # Board dimensions, timing, scoring tables
│   │   ├── types.ts             # All type/enum/interface definitions
│   │   ├── Board.ts             # 10x40 grid, collision, line clearing
│   │   ├── Piece.ts             # Piece shape definitions (all rotations)
│   │   ├── ActivePiece.ts       # Active piece state and movement
│   │   ├── SRS.ts               # Super Rotation System + wall kicks
│   │   ├── Randomizer.ts        # 7-bag random piece generator
│   │   ├── ScoreManager.ts      # Score calculation and tracking
│   │   ├── LockDelay.ts         # Lock delay timer with move resets
│   │   ├── TSpinDetector.ts     # T-Spin detection (3-corner rule)
│   │   ├── ComboTracker.ts      # Combo counter
│   │   ├── GravityTimer.ts      # Per-level gravity timing
│   │   ├── GameState.ts         # Aggregate game state
│   │   ├── GameEngine.ts        # Main engine: tick(), applyAction(), getSnapshot()
│   │   ├── EventBus.ts          # Typed event emitter
│   │   └── __tests__/           # Unit tests for engine modules
│   ├── input/                   # Keyboard + DAS/ARR
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── KeyboardManager.ts   # Key event handling, OS repeat rejection
│   │   ├── DASManager.ts        # Delayed auto-shift + auto-repeat
│   │   └── InputMapper.ts       # Key code → GameAction mapping
│   ├── renderer/                # Canvas 2D rendering
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── GameRenderer.ts      # Main render orchestrator
│   │   ├── BoardRenderer.ts     # Grid lines and background
│   │   ├── PieceRenderer.ts     # Active piece and ghost piece
│   │   ├── BlockRenderer.ts     # Individual block (bevel shading)
│   │   ├── AnimationManager.ts  # Line clear and lock animations
│   │   ├── ParticleSystem.ts    # Particle effects
│   │   ├── TextPopup.ts         # Score/combo text popups
│   │   └── colors.ts            # Color palette constants
│   ├── game/                    # Glue layer
│   │   ├── GameLoop.ts          # requestAnimationFrame + fixed timestep
│   │   └── GameSession.ts       # Connects engine, renderer, input, React
│   ├── ui/                      # React components
│   │   ├── screens/
│   │   │   ├── MainMenu.tsx
│   │   │   ├── ModeSelectScreen.tsx  # Mode toggle + level picker
│   │   │   ├── GameScreen.tsx
│   │   │   ├── PauseOverlay.tsx
│   │   │   ├── GameOverScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── hud/
│   │   │   ├── ScoreDisplay.tsx
│   │   │   ├── LevelDisplay.tsx
│   │   │   ├── LinesDisplay.tsx
│   │   │   ├── TimerDisplay.tsx      # Practice mode countdown
│   │   │   ├── HoldPiece.tsx
│   │   │   ├── NextQueue.tsx
│   │   │   ├── ComboPopup.tsx
│   │   │   └── HUD.tsx
│   │   ├── settings/
│   │   │   ├── KeyBindings.tsx
│   │   │   └── GameSettings.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       └── Modal.tsx
│   ├── hooks/
│   │   ├── useGameSession.ts    # Creates/manages GameSession lifecycle
│   │   ├── useGameState.ts      # Throttled snapshot → React state
│   │   ├── useSettings.ts       # Persisted user settings
│   │   ├── usePersonalBests.ts  # Per-mode high score persistence
│   │   └── useAnimationFrame.ts # rAF hook
│   ├── audio/                   # Sound (future)
│   │   ├── AudioManager.ts
│   │   └── sounds.ts
│   └── utils/
│       ├── clamp.ts
│       ├── lerp.ts
│       └── timer.ts
├── public/
│   └── fonts/
└── tests/
    └── integration/
        └── GameSession.test.ts
```

## Key Design Decisions

### Why Canvas 2D (not WebGL or DOM)

- **Sufficient performance:** The playfield is 10x20 visible cells — roughly 1,200 draw calls per frame, well within Canvas 2D's budget.
- **Simpler code:** No shader programs, no GPU state management. `fillRect` and `fill()` calls are straightforward.
- **Rich effects:** Bevel shading, particles, and text popups are easy with Canvas 2D's immediate-mode API.
- **WebGL is overkill** for a 2D grid game with simple animations.

### Why Decoupled Engine

- **Testability:** Pure functions and classes with no browser dependencies. Unit tests run fast without mocking DOM.
- **Multiplayer readiness:** The engine can run on a Node.js server for authoritative game state. Snapshots are plain serializable objects.
- **Replay/spectator:** Deterministic engine + seeded randomizer = replayable games.
- **Separation of concerns:** Rendering and input are completely independent of game logic.

### Why React for UI (not for the game itself)

- React manages menus, HUD, settings, and overlays — things that benefit from declarative UI.
- The actual game rendering is imperative Canvas 2D via `requestAnimationFrame`, bypassing React's render cycle entirely.
- State flows from engine to React via throttled callbacks (~10fps), not per-frame.

### Game Modes

The engine supports multiple game modes via the `GameMode` enum and constructor options. Mode-specific behavior is isolated to three areas:

1. **Level advancement** — Marathon advances levels per the lines-per-level table. Practice keeps the level fixed at `startLevel`.
2. **Countdown timer** — Practice mode decrements `remainingMs` each tick. Marathon ignores `remainingMs` (it stays `null`).
3. **Game-over trigger** — Marathon ends on top-out (`reason: 'topout'`). Practice ends on top-out or timer expiry (`reason: 'timeout'`).

All other engine behavior (SRS, scoring formula, lock delay, combos, back-to-back) is mode-agnostic. This keeps the mode logic minimal and avoids branching throughout the engine.

### Why Fixed-Timestep Game Loop

- **Deterministic:** Game logic runs at a fixed 60 ticks/second regardless of monitor refresh rate.
- **Consistent:** Gravity, lock delay, and DAS timing behave identically on 60Hz and 144Hz displays.
- **Frame interpolation** is passed to the renderer for smooth visuals between ticks.
- Frame time is clamped to 250ms to prevent spiraling when the tab is backgrounded.

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

## Multiplayer Readiness

The architecture includes several provisions for future multiplayer:

1. **Server-capable engine:** Zero browser dependencies. Can `npm install` the engine package on a Node.js server.
2. **Serializable snapshots:** `GameSnapshot` contains only plain objects — no functions, no circular references. `JSON.stringify` works directly.
3. **Seeded randomizer:** The 7-bag randomizer accepts an optional seed (using xorshift128+ or mulberry32 PRNG), enabling deterministic sequences across clients.
4. **Snapshot reconstruction:** `GameEngine.fromSnapshot(snapshot, eventBus)` can reconstruct engine state from a snapshot, enabling server reconciliation.
5. **Attack system interface:** `Board.insertGarbageRows(count, gapColumn)` is stubbed. The `AttackTable` type defines attack values for all clear types.
6. **EventBus:** Events like `LINE_CLEAR` carry enough data to calculate attack lines. A future `MultiplayerSession` subscribes to these events and routes attacks between players.
7. **Architecture for two players:** `MultiplayerSession` creates two `GameEngine` instances and an `AttackCalculator` to route garbage between them.
