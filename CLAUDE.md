# Stackdown

Browser-based block-stacking game with two single-player modes: Marathon (15 levels, topout-based) and Practice (fixed gravity level, 2-minute timer). Built with Canvas 2D + React + TypeScript.

## Tech Stack

- **Build**: Vite + TypeScript (strict mode)
- **UI**: React 19 (menus/HUD only, not game rendering)
- **Rendering**: Canvas 2D (imperative, via `requestAnimationFrame`)
- **Testing**: Vitest + jsdom
- **State**: No state library. Engine owns state, React receives throttled snapshots.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Type-check and build for production
- `npm run test` — Run tests once
- `npm run test:watch` — Run tests in watch mode
- `npx tsc --noEmit` — Type-check without emitting

## Architecture

Three-layer architecture. See `docs/project/ARCHITECTURE.md` for the full system diagram.

- **Engine** (`src/engine/`) — Pure TS game logic. Board, SRS rotation, scoring, gravity, lock delay, T-Spin detection, EventBus. Zero DOM imports — runnable in Node.
- **Renderer** (`src/renderer/`) — Canvas 2D drawing. Receives `GameSnapshot`, draws playfield, pieces, ghost, effects. Uses `OffscreenCanvas` for grid caching.
- **React UI + Glue** (`src/ui/`, `src/game/`) — React for HUD/menus/overlays. `GameSession` + `GameLoop` connect engine, renderer, and input via `requestAnimationFrame`. State pushed to React at ~10fps.

### Key source files

| Area | Key files |
|------|-----------|
| Types & constants | `src/engine/types.ts`, `src/engine/constants.ts` |
| Core engine | `src/engine/GameEngine.ts`, `src/engine/Board.ts`, `src/engine/Piece.ts`, `src/engine/SRS.ts` |
| Scoring & mechanics | `src/engine/ScoreManager.ts`, `src/engine/GravityTimer.ts`, `src/engine/LockDelay.ts`, `src/engine/TSpinDetector.ts`, `src/engine/ComboTracker.ts` |
| Events | `src/engine/EventBus.ts` |
| Rendering | `src/renderer/GameRenderer.ts`, `src/renderer/BoardRenderer.ts`, `src/renderer/BlockRenderer.ts`, `src/renderer/PieceRenderer.ts` |
| Effects | `src/renderer/AnimationManager.ts`, `src/renderer/TextPopup.ts`, `src/renderer/ParticleSystem.ts` |
| Input | `src/input/KeyboardManager.ts`, `src/input/DASManager.ts`, `src/input/InputMapper.ts` |
| Game loop | `src/game/GameLoop.ts`, `src/game/GameSession.ts` |
| UI screens | `src/ui/MainMenu.tsx`, `src/ui/ModeSelectScreen.tsx`, `src/ui/GameScreen.tsx`, `src/ui/SettingsScreen.tsx` |
| UI overlays | `src/ui/PauseOverlay.tsx`, `src/ui/GameOverOverlay.tsx`, `src/ui/HUD.tsx` |
| Hooks | `src/ui/useGameSession.ts`, `src/hooks/usePersonalBests.ts`, `src/hooks/useSettings.ts`, `src/hooks/useMenuNavigation.ts` |
| Audio | `src/audio/AudioManager.ts` (stub) |
| App entry | `src/App.tsx`, `src/main.tsx` |

## Conventions

- Engine code: zero DOM/browser imports. Must be runnable in Node.
- Grid coordinates: `grid[row][col]`, row 0 = top, positive Y = down.
- Visible area: rows 20-39 of the 40-row grid. Rows 0-19 are buffer.
- Spawn position: row 18 (just above visible area).
- All type definitions in `src/engine/types.ts`. All constants in `src/engine/constants.ts`.
- Barrel exports: each module (`engine/`, `renderer/`, `input/`) has an `index.ts`.
- No allocations in render hot path. Pre-compute colors/gradients/paths.
- Input uses `KeyboardEvent.code` (not `.key`). OS repeat rejected. DAS/ARR for movement.
- Snapshots are plain serializable objects — no methods, no circular refs.
- Canvas context: `{ alpha: false }`. Grid lines cached to `OffscreenCanvas`.
- Fixed-timestep game loop (60 ticks/sec, 16.667ms). Frame time clamped to 250ms.

## Spec Docs

Detailed design specs live in `docs/` organized by domain:

- `docs/game/ENGINE.md` — Types, board, pieces, SRS, gravity, scoring, T-Spin, lock delay, events, GameEngine API
- `docs/game/RENDERER.md` — Block rendering, colors, grid, ghost piece, animations, text popups
- `docs/game/INPUT.md` — Key bindings, DAS/ARR algorithm, direction priority
- `docs/game/UI.md` — Screen flow, components, HUD, layout, personal bests, settings
- `docs/multiplayer/VERSUS.md` — Versus mode mechanics: garbage exchange, KO system, match lifecycle
- `docs/multiplayer/MULTIPLAYER.md` — Online networking: WebSocket relay, room management, state sync protocol
- `docs/project/ARCHITECTURE.md` — System diagram, data flow, project structure, design decisions
- `docs/project/TASKS.md` — Implementation task breakdown
