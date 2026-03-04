import { PieceType } from '../engine';
import { PIECE_COLORS, BOARD_COLORS } from './colors';

type DrawContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const BEVEL_RATIO = 0.15;

/** All block color keys: 7 piece types + garbage. */
const BLOCK_COLOR_KEYS: readonly (PieceType | 'garbage')[] = [
  PieceType.I, PieceType.O, PieceType.T, PieceType.S,
  PieceType.Z, PieceType.J, PieceType.L, 'garbage',
];

/**
 * Pre-rendered block templates at a specific cell size.
 * Each piece type (+ garbage) gets a cellSize x cellSize OffscreenCanvas.
 */
export class BlockTemplateCache {
  private cache = new Map<PieceType | 'garbage', OffscreenCanvas>();

  rebuild(cellSize: number): void {
    this.cache.clear();
    for (const key of BLOCK_COLOR_KEYS) {
      const canvas = new OffscreenCanvas(cellSize, cellSize);
      const ctx = canvas.getContext('2d')!;
      const color = key === 'garbage' ? BOARD_COLORS.garbage : PIECE_COLORS[key];
      drawBlock(ctx, 0, 0, cellSize, color);
      this.cache.set(key, canvas);
    }
  }

  get(key: PieceType | 'garbage'): OffscreenCanvas | undefined {
    return this.cache.get(key);
  }
}

/** Draw a cached block template at (x, y) via drawImage. */
export function drawCachedBlock(
  ctx: CanvasRenderingContext2D,
  cache: BlockTemplateCache,
  x: number,
  y: number,
  key: PieceType | 'garbage',
): void {
  const template = cache.get(key);
  if (template) {
    ctx.drawImage(template, x, y);
  }
}

export function drawBlock(
  ctx: DrawContext,
  x: number,
  y: number,
  cellSize: number,
  color: string,
): void {
  const bevel = cellSize * BEVEL_RATIO;

  // 1. Base fill
  ctx.fillStyle = color;
  ctx.fillRect(x, y, cellSize, cellSize);

  // 2. Center face gradient (inner rect)
  const innerX = x + bevel;
  const innerY = y + bevel;
  const innerW = cellSize - bevel * 2;
  const innerH = cellSize - bevel * 2;

  const centerGrad = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
  centerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  centerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
  centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = centerGrad;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // 3. Top bevel trapezoid: rgba(255,255,255,0.4)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + cellSize, y);
  ctx.lineTo(x + cellSize - bevel, y + bevel);
  ctx.lineTo(x + bevel, y + bevel);
  ctx.closePath();
  ctx.fill();

  // 4. Left bevel trapezoid: rgba(255,255,255,0.2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bevel, y + bevel);
  ctx.lineTo(x + bevel, y + cellSize - bevel);
  ctx.lineTo(x, y + cellSize);
  ctx.closePath();
  ctx.fill();

  // 5. Bottom bevel trapezoid: rgba(0,0,0,0.4)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.moveTo(x, y + cellSize);
  ctx.lineTo(x + bevel, y + cellSize - bevel);
  ctx.lineTo(x + cellSize - bevel, y + cellSize - bevel);
  ctx.lineTo(x + cellSize, y + cellSize);
  ctx.closePath();
  ctx.fill();

  // 6. Right bevel trapezoid: rgba(0,0,0,0.2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.moveTo(x + cellSize, y);
  ctx.lineTo(x + cellSize, y + cellSize);
  ctx.lineTo(x + cellSize - bevel, y + cellSize - bevel);
  ctx.lineTo(x + cellSize - bevel, y + bevel);
  ctx.closePath();
  ctx.fill();

  // 7. Specular highlight: radial gradient clipped to top-left square
  const specCenterX = x + cellSize * 0.28;
  const specCenterY = y + cellSize * 0.28;
  const specRadius = cellSize * 0.12;
  const clipSize = cellSize * 0.35;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, clipSize, clipSize);
  ctx.clip();

  const specGrad = ctx.createRadialGradient(
    specCenterX, specCenterY, 0,
    specCenterX, specCenterY, specRadius,
  );
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = specGrad;
  ctx.fillRect(x, y, clipSize, clipSize);
  ctx.restore();

  // 8. Outer border: rgba(0,0,0,0.5), 1px, 0.5px offset for crisp lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
}
