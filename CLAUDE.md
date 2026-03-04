# Stackdown

## Why

Browser-based block-stacking game with two single-player modes: Marathon (15 levels, topout-based) and Practice (fixed gravity level, 2-minute timer). Built with Canvas 2D + React + TypeScript. Engine is pure TS with zero browser deps for future multiplayer/server use.

## Architecture

Three-layer architecture. Read `docs/ARCHITECTURE.md` for the full system diagram and data flow.

- **Engine** (`src/engine/`) — Pure TS game logic. Board, SRS rotation, scoring, gravity, lock delay, T-Spin detection, EventBus. Zero DOM imports.
- **Renderer** (`src/renderer/`) — Canvas 2D drawing. Receives `GameSnapshot`, draws playfield, pieces, ghost, effects. Uses `OffscreenCanvas` for grid caching.
- **React UI + Glue** (`src/ui/`, `src/game/`) — React for HUD/menus/overlays. `GameSession` + `GameLoop` connect engine, renderer, and input via `requestAnimationFrame`. State pushed to React at ~10fps.

### Key patterns
- Fixed-timestep game loop (60 ticks/sec, 16.667ms). Frame time clamped to 250ms.
- Input: `KeyboardEvent.code` (not `.key`). OS repeat rejected. DAS/ARR for movement. Immediate actions bypass DAS.
- Snapshots are plain serializable objects — no methods, no circular refs.
- Canvas context: `{ alpha: false }`. Grid lines cached to `OffscreenCanvas`.

## Tasks — WAT Workflow

Implementation is broken into 6 phases with 39 granular tasks. Each task has a dedicated spec file.

### How to work on a task

1. **Check status** in `docs/tasks/INDEX.md` for the task list and dependency graph
2. **Read the task file** at `docs/tasks/{task-id}.md` — it lists spec references, prerequisites, files to create/modify, and acceptance criteria
3. **Read only the referenced spec sections** from the module docs (ENGINE.md, RENDERER.md, INPUT.md, UI.md) — don't read the whole doc unless needed
4. **Write tests first** (Phases 1-2, 4): Engine and input tasks use TDD. Write a failing test, implement the minimum to pass, refactor. Renderer and UI tasks skip TDD — verify visually.
5. **Implement** following the acceptance criteria exactly
6. **Verify**: `npx tsc --noEmit` passes, `npx vitest run` passes, no circular imports
7. **Mark complete** in `docs/tasks/INDEX.md`

### Phase overview

| Phase | Focus | Key milestone |
|-------|-------|---------------|
| 1 | Foundation — types, board, pieces, SRS, randomizer, events | Core data structures |
| 2 | Engine — gravity, lock delay, T-spin, scoring, GameEngine | Engine complete |
| 3 | Rendering — blocks, board, pieces, animations, text popups | Visual output |
| 4 | Input + Game Loop — DAS/ARR, keyboard, game loop, session | **Game playable** |
| 5 | React UI — screens, HUD, menus, overlays, routing, mode selection, personal bests | Full UI |
| 6 | Polish — particles, settings, responsive, audio stub | Polish complete |

### Critical path to playable game
```
1.1 -> 1.2 -> [1.3, 1.4, 1.6, 1.7] -> 1.5 -> [2.1-2.5] -> 2.6 -> 2.7 -> [3.x, 4.1-4.4] -> 4.5
```

## Spec Reference Map

When implementing, consult these docs for detailed specs:

| Module | Doc | Key sections |
|--------|-----|-------------|
| Types, enums, constants | `docs/ENGINE.md` | Type Definitions, Constants |
| Board & collision | `docs/ENGINE.md` | Board (grid, collision, line clearing) |
| Piece shapes (all rotations) | `docs/ENGINE.md` | Piece Shapes |
| SRS wall kicks | `docs/ENGINE.md` | Super Rotation System |
| 7-bag randomizer | `docs/ENGINE.md` | 7-Bag Randomizer |
| T-Spin detection | `docs/ENGINE.md` | T-Spin Detection (3-corner rule) |
| Lock delay | `docs/ENGINE.md` | Lock Delay |
| Gravity timing table | `docs/ENGINE.md` | Gravity (per-level timing, lines per level) |
| Scoring & combos | `docs/ENGINE.md` | Scoring (base points, B2B, combo, drops) |
| EventBus & events | `docs/ENGINE.md` | EventBus |
| GameEngine API | `docs/ENGINE.md` | GameEngine API (tick, applyAction, getSnapshot) |
| Block bevel shading | `docs/RENDERER.md` | Block Rendering |
| Color palette | `docs/RENDERER.md` | Color Palette |
| Grid/board rendering | `docs/RENDERER.md` | Grid Rendering |
| Ghost piece | `docs/RENDERER.md` | Ghost Piece Rendering |
| Line clear animation | `docs/RENDERER.md` | Line Clear Animation (flash + dissolve) |
| Text popups | `docs/RENDERER.md` | Text Popup System |
| Active piece interpolation | `docs/RENDERER.md` | Active Piece Interpolation |
| Key bindings | `docs/INPUT.md` | Key Bindings, Action Classification |
| DAS/ARR algorithm | `docs/INPUT.md` | DAS/ARR Algorithm |
| Direction priority | `docs/INPUT.md` | Direction Priority |
| Screen flow & components | `docs/UI.md` | Screen Flow, Component Tree |
| Canvas-React boundary | `docs/UI.md` | Canvas-React Boundary |
| useGameSession hook | `docs/UI.md` | useGameSession Hook |
| HUD components | `docs/UI.md` | HUD Components |
| Layout & responsive sizing | `docs/UI.md` | Layout |
| Game modes & practice timer | `docs/ENGINE.md` | GameMode enum, Constants, Gravity — Mode-Specific Behavior |
| Personal bests persistence | `docs/UI.md` | Personal Bests Persistence |
| Mode select screen | `docs/UI.md` | Menu Components — ModeSelectScreen |
| Timer display | `docs/UI.md` | HUD Components — TimerDisplay |

## Tech Stack

- **Build**: Vite + TypeScript (strict mode)
- **UI**: React (menus/HUD only, not game rendering)
- **Rendering**: Canvas 2D (imperative, via `requestAnimationFrame`)
- **Testing**: Vitest
- **State**: No state library. Engine owns state, React receives throttled snapshots.

## Conventions

- Engine code: zero DOM/browser imports. Must be runnable in Node.
- Grid coordinates: `grid[row][col]`, row 0 = top, positive Y = down.
- Visible area: rows 20-39 of the 40-row grid. Rows 0-19 are buffer.
- Spawn position: row 18 (just above visible area).
- All type definitions live in `src/engine/types.ts`. All constants in `src/engine/constants.ts`.
- Barrel exports: each module (`engine/`, `renderer/`, `input/`) has an `index.ts`.
- No allocations in render hot path. Pre-compute colors/gradients/paths.
