import { drawBlock } from './BlockRenderer';
import {
  getBlocks,
  type ActivePieceState,
  PieceType,
  RotationState,
  VISIBLE_HEIGHT,
  BOARD_HEIGHT,
} from '../engine';
import { PIECE_COLORS, BOARD_COLORS } from './colors';

const BUFFER_ROWS = BOARD_HEIGHT - VISIBLE_HEIGHT; // 20

/**
 * Draw the active (falling) piece on the playfield.
 * Only renders blocks in the visible area (row >= BUFFER_ROWS).
 * interpolationY is an optional fractional row offset for smooth gravity.
 */
export function drawActivePiece(
  ctx: CanvasRenderingContext2D,
  piece: ActivePieceState,
  cellSize: number,
  interpolationY?: number,
): void {
  const blocks = getBlocks(piece.type, piece.rotation);
  const color = PIECE_COLORS[piece.type];
  const yOffset = interpolationY ?? 0;

  for (const block of blocks) {
    const absRow = block.y + piece.position.y;
    // Only render visible rows
    if (absRow < BUFFER_ROWS) continue;

    const px = (block.x + piece.position.x) * cellSize;
    const py = (absRow - BUFFER_ROWS + yOffset) * cellSize;
    drawBlock(ctx, px, py, cellSize, color);
  }
}

/**
 * Draw the ghost piece (hard-drop preview) at the given ghostY position.
 * Rendered as a semi-transparent fill + outline.
 */
export function drawGhostPiece(
  ctx: CanvasRenderingContext2D,
  piece: ActivePieceState,
  ghostY: number,
  cellSize: number,
): void {
  const blocks = getBlocks(piece.type, piece.rotation);
  const color = PIECE_COLORS[piece.type];

  for (const block of blocks) {
    const absRow = block.y + ghostY;
    if (absRow < BUFFER_ROWS) continue;

    const px = (block.x + piece.position.x) * cellSize;
    const py = (absRow - BUFFER_ROWS) * cellSize;

    // Semi-transparent fill
    ctx.globalAlpha = BOARD_COLORS.ghostPieceAlpha;
    ctx.fillStyle = color;
    ctx.fillRect(px, py, cellSize, cellSize);

    // Outline at higher alpha
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw a centered piece preview (for hold box / next queue panels).
 * Draws the piece in SPAWN rotation, centered within the given context area.
 */
export function drawPiecePreview(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  cellSize: number,
): void {
  const blocks = getBlocks(type, RotationState.SPAWN);
  const color = PIECE_COLORS[type];

  // Compute bounding box of the piece's blocks
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const block of blocks) {
    if (block.x < minX) minX = block.x;
    if (block.x > maxX) maxX = block.x;
    if (block.y < minY) minY = block.y;
    if (block.y > maxY) maxY = block.y;
  }

  const pieceWidth = (maxX - minX + 1) * cellSize;
  const pieceHeight = (maxY - minY + 1) * cellSize;

  // Center within a 4x3 cell area
  const areaWidth = 4 * cellSize;
  const areaHeight = 3 * cellSize;
  const offsetX = (areaWidth - pieceWidth) / 2 - minX * cellSize;
  const offsetY = (areaHeight - pieceHeight) / 2 - minY * cellSize;

  for (const block of blocks) {
    const px = block.x * cellSize + offsetX;
    const py = block.y * cellSize + offsetY;
    drawBlock(ctx, px, py, cellSize, color);
  }
}
