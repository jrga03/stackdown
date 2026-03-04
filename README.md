# Stackdown

Browser-based block-stacking game with two single-player modes:

- **Marathon** — 15 levels, increasing gravity, play until topout
- **Practice** — Fixed gravity level, 2-minute timer

Built with Canvas 2D + React + TypeScript. The engine is pure TypeScript with zero browser dependencies.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Architecture

Three-layer design:

- **Engine** (`src/engine/`) — Pure TS game logic: board, SRS rotation, scoring, gravity, lock delay, T-spin detection. Zero DOM imports, runnable in Node.
- **Renderer** (`src/renderer/`) — Canvas 2D drawing: playfield, pieces, ghost piece, animations, particles. Uses OffscreenCanvas for grid caching.
- **Input** (`src/input/`) — Keyboard handling with DAS/ARR for movement, direction priority, and window blur handling.
- **UI** (`src/ui/`, `src/game/`) — React for HUD, menus, and overlays. GameSession + GameLoop connect engine, renderer, and input via requestAnimationFrame.

See `docs/ARCHITECTURE.md` for the full system diagram and data flow.

## Tech Stack

- **Build**: Vite + TypeScript (strict mode)
- **UI**: React 19
- **Rendering**: Canvas 2D
- **Testing**: Vitest
