import { BOARD_WIDTH, VISIBLE_HEIGHT } from '../engine';
import { BOARD_COLORS } from './colors';

export class BoardRenderer {
  private gridCache: OffscreenCanvas | HTMLCanvasElement | null = null;
  private cachedWidth = 0;
  private cachedHeight = 0;

  createGridCache(width: number, height: number, cellSize: number): void {
    // Only regenerate if dimensions changed
    if (width === this.cachedWidth && height === this.cachedHeight) return;

    this.cachedWidth = width;
    this.cachedHeight = height;

    // Try OffscreenCanvas, fall back to HTMLCanvasElement
    let canvas: OffscreenCanvas | HTMLCanvasElement;
    try {
      canvas = new OffscreenCanvas(width, height);
    } catch {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) return;

    // Background fill
    ctx.fillStyle = BOARD_COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = BOARD_COLORS.gridLine;
    ctx.lineWidth = 1;

    // 11 vertical lines (0 through BOARD_WIDTH)
    for (let col = 0; col <= BOARD_WIDTH; col++) {
      const x = col * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 21 horizontal lines (0 through VISIBLE_HEIGHT)
    for (let row = 0; row <= VISIBLE_HEIGHT; row++) {
      const y = row * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = BOARD_COLORS.gridBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    this.gridCache = canvas;
  }

  drawCachedGrid(ctx: CanvasRenderingContext2D): void {
    if (!this.gridCache) return;
    ctx.drawImage(this.gridCache, 0, 0);
  }
}
