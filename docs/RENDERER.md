# Renderer Module Spec

The renderer draws the game to a Canvas 2D context. It receives a `GameSnapshot` from the engine and produces a visual frame. The renderer has no game logic — it only reads state and draws.

## Render Pipeline

Each frame follows this order:

1. **Grid background** — Cached to `OffscreenCanvas`, blitted to main canvas.
2. **Locked blocks** — All non-null cells in the grid.
3. **Ghost piece** — The active piece projected to its hard-drop destination, drawn semi-transparent.
4. **Active piece** — The current falling piece, with interpolation for smooth gravity.
5. **Effects** — Line clear animations, lock flash, text popups, particles.

### Lock Flash

When a piece locks, all cells of the locked piece flash white at `rgba(255, 255, 255, 0.6)` for 100ms (rendered as a single-frame overlay on top of the normal block), then return to standard block rendering. This is a brief visual confirmation, not an animation — it renders for one frame then clears.

---

## Block Rendering

Each block is a single cell drawn with bevel shading to create a 3D appearance.

### Bevel Shading Recipe

**Bevel ratio:** 0.15 (bevel width as a fraction of cell size)

Given a cell at pixel position `(px, py)` with size `cellSize`:

1. **Base fill:** Fill entire cell with the piece's base color.

2. **Center face gradient:** Draw the inner rectangle (inset by bevel width) with a vertical linear gradient from `y = bevelWidth` to `y = cellSize - bevelWidth`:
   - Top (0%): `rgba(255, 255, 255, 0.15)` (lighter)
   - Middle (50%): `rgba(255, 255, 255, 0.0)` (neutral)
   - Bottom (100%): `rgba(0, 0, 0, 0.1)` (slightly darker)

3. **Top bevel (trapezoid):** `rgba(255, 255, 255, 0.4)` — bright highlight.
   - Outer: full cell top edge
   - Inner: inset top edge

4. **Left bevel (trapezoid):** `rgba(255, 255, 255, 0.2)` — medium highlight.
   - Outer: full cell left edge
   - Inner: inset left edge

5. **Bottom bevel (trapezoid):** `rgba(0, 0, 0, 0.4)` — dark shadow.
   - Outer: full cell bottom edge
   - Inner: inset bottom edge

6. **Right bevel (trapezoid):** `rgba(0, 0, 0, 0.2)` — medium shadow.
   - Outer: full cell right edge
   - Inner: inset right edge

7. **Specular highlight:** Radial gradient in the top-left area of the cell.
   - Center: `(cellSize * 0.28, cellSize * 0.28)` relative to cell origin
   - Radius: `cellSize * 0.12`
   - Inner color: `rgba(255, 255, 255, 0.5)`
   - Outer color: `transparent`
   - Clipped to a `cellSize * 0.35 × cellSize * 0.35` rectangle in the top-left corner

8. **Outer border:** `rgba(0, 0, 0, 0.5)`, 1px stroke.
   - Use 0.5px offset for crisp lines on retina: `strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1)`

### Implementation Note

`BlockRenderer.drawBlock(ctx, x, y, cellSize, color)` uses `fillRect` and `fill()` calls with pre-built paths. No `drawImage` — everything is drawn procedurally.

---

## Color Palette

### Piece Colors

| Piece | Color Name | Hex |
|-------|-----------|-----|
| I | Cyan | `#00E5FF` |
| O | Yellow | `#FFD600` |
| T | Purple | `#AA00FF` |
| S | Green | `#00E676` |
| Z | Red | `#FF1744` |
| J | Blue | `#2979FF` |
| L | Orange | `#FF9100` |

```typescript
const PIECE_COLORS: Record<PieceType, string> = {
  [PieceType.I]: '#00E5FF',
  [PieceType.O]: '#FFD600',
  [PieceType.T]: '#AA00FF',
  [PieceType.S]: '#00E676',
  [PieceType.Z]: '#FF1744',
  [PieceType.J]: '#2979FF',
  [PieceType.L]: '#FF9100',
};
```

### Board Colors

```typescript
const BOARD_COLORS = {
  background: '#0A0A12',                    // Very dark blue-black
  gridLine: 'rgba(255, 255, 255, 0.06)',    // Subtle grid lines
  gridBorder: '#1A1A2E',                    // Border around playfield
  ghostPieceAlpha: 0.2,                     // Ghost piece transparency
  garbage: '#8A8A8A',                       // Medium gray (for future garbage rows)
};
```

### Text Popup Colors

| Action | Color |
|--------|-------|
| Quad | Yellow |
| T-Spin | Purple |
| Combo | White |

---

## Grid Rendering

### Cached Grid Background

The grid background (lines and border) is drawn to an `OffscreenCanvas` and cached. It is only redrawn when the canvas size changes (resize event).

```typescript
class BoardRenderer {
  private gridCache: OffscreenCanvas | null;

  createGridCache(width: number, height: number, cellSize: number): void;
  drawCachedGrid(ctx: CanvasRenderingContext2D): void;
}
```

The cached grid includes:
- Board background fill (`BOARD_COLORS.background`)
- Vertical grid lines (10 columns → 11 lines)
- Horizontal grid lines (20 visible rows → 21 lines)
- Outer border (`BOARD_COLORS.gridBorder`)

### Visible Area

Only the bottom 20 rows of the 40-row grid are rendered. Rows 0–19 (buffer zone) are never drawn.

---

## Ghost Piece Rendering

The ghost piece shows where the active piece will land if hard-dropped.

### Calculation

Same shape and rotation as the active piece. Position is computed by projecting the piece straight down until it would collide, then backing up one row.

### Drawing

- Each block of the ghost piece is drawn using the piece's base color at `ghostPieceAlpha` (0.2) opacity.
- An additional outline is drawn around each block:
  - Color: piece color at 0.5 alpha
  - Line width: 1.5px
  - Inset: 1px from cell edge (`strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2)`)

---

## Line Clear Animation

Total duration: ~400ms.

### Phase 1: Flash (0ms – 150ms)

Progress: 0.0 – 0.375 of total duration.

- A white rectangle expands horizontally from the center of each cleared row.
- Width grows from 0% to 100% of the row width.
- Opacity: `0.8 - flashProgress × 0.5`
  - Starts at 0.8, fades to ~0.6 by end of flash phase.

### Phase 2: Dissolve (150ms – 400ms)

Progress: 0.375 – 1.0 of total duration.

- Individual blocks in cleared rows shrink toward their centers.
- Scale: `1.0 - dissolveProgress` (shrinks from full size to zero).
- Alpha: `1.0 - dissolveProgress` (fades from fully opaque to invisible).
- Blocks are drawn white during the dissolve phase (not their original color).

### Row Collapse

Rows above the cleared lines do **not** visually collapse until the animation completes. The engine may have already removed the rows from the grid, so the `AnimationManager` stores the cleared row data separately.

```typescript
interface LineClearAnimation {
  rows: number[];         // row indices being cleared
  rowData: Cell[][];      // snapshot of the cells in those rows
  elapsed: number;        // ms since animation started
  duration: number;       // total duration (400ms)
}
```

---

## Text Popup System

Text popups display scoring actions (e.g., "QUAD", "T-SPIN DOUBLE", "3 COMBO") that float upward and fade out.

### Animation Phases

Given total duration and current progress (0.0 to 1.0):

| Phase | Progress Range | Scale | Alpha |
|-------|---------------|-------|-------|
| Pop-in | 0% – 15% | 0.0 → 1.2 | 1.0 |
| Settle | 15% – 25% | 1.2 → 1.0 | 1.0 |
| Normal | 25% – 70% | 1.0 | 1.0 |
| Fade out | 70% – 100% | 1.0 | 1.0 → 0.0 |

### Float

- Popups drift upward at a configurable speed (pixels per second).
- `y = startY - floatSpeed × (elapsed / 1000)`

### Text Rendering

- Font: `bold ${size}px 'Segoe UI', Arial, sans-serif`
- Dark outline: drawn 4 times at pixel offsets `[-2, 0]`, `[+2, 0]`, `[0, -2]`, `[0, +2]` in `rgba(0, 0, 0, 0.8)`.
- Main text fill: drawn on top in the action's configured color.

```typescript
interface TextPopup {
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  floatSpeed: number;     // pixels per second
  elapsed: number;
  duration: number;
}
```

### Default Duration

Text popup default display duration: **2000ms**. Breakdown: fade-in 100ms, hold 1600ms, float-up + fade-out 300ms.

### Practice Mode: "TIME'S UP!" Popup

When the practice mode timer expires (game over with `reason: 'timeout'`), the TextPopup system displays a large "TIME'S UP!" popup centered on the playfield. Uses the same animation phases as other text popups (pop-in → settle → normal → fade out) with a yellow color and larger font size than standard action popups.

---

## Active Piece Interpolation

For smooth gravity between fixed-timestep ticks, the active piece's Y position is interpolated:

```
renderY = piece.position.y + interpolationFactor × gravityProgress
```

Where `interpolationFactor` is `accumulatorMs / TICK_MS` from the game loop (0.0 to 1.0), and `gravityProgress` represents how far into the next gravity drop the piece is.

---

## Performance Notes

### Opaque Canvas

The canvas context is created with `{ alpha: false }`:

```typescript
canvas.getContext('2d', { alpha: false });
```

This tells the browser the canvas has no transparency, enabling faster compositing.

### Grid Caching

Grid lines are static and only change on resize. Caching them to an `OffscreenCanvas` eliminates ~42 `lineTo` calls per frame.

### Draw Call Budget

- Visible grid: 10 × 20 = 200 cells maximum.
- Each block: ~8 draw calls (fill + 4 bevels + gradient + specular + border).
- Per frame: ~200 blocks × 8 = ~1,600 draw calls + ghost + active piece + effects.
- Well within Canvas 2D's per-frame budget (typically handles 10,000+ draw calls).

### No Allocations in Render Loop

- No object creation in the hot path.
- Pre-compute colors, gradients, and paths where possible.
- Use simple math (linear interpolation, basic easing) — no trigonometry in the main render loop.

### Hold and Next Queue

Hold piece and next queue are drawn on **separate small canvases** (not the main playfield canvas). They only re-render when the held piece or next queue changes, not every frame.

**Canvas dimensions:**
- **Hold piece:** `4 × cellSize` wide by `3 × cellSize` tall (accommodates all piece shapes centered in their bounding box).
- **Next queue:** `4 × cellSize` wide by `(3 × cellSize × 5) + (gap × 4)` tall, where `gap = cellSize × 0.5`. Each preview piece is centered within its `4 × 3` cell area.

---

## GameRenderer API

```typescript
class GameRenderer {
  constructor(canvas: HTMLCanvasElement);

  resize(width: number, height: number): void;
  draw(snapshot: GameSnapshot, interpolation: number): void;
  destroy(): void;
}
```

- `resize()`: Called on window resize. Recalculates cell size and regenerates the grid cache.
- `draw()`: Main render method called every `requestAnimationFrame`. Takes a snapshot and interpolation factor.
- `destroy()`: Cleans up cached canvases and releases resources.
