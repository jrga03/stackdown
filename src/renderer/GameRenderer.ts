import {
  type GameSnapshot,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
  BOARD_WIDTH,
  EventBus,
  getBlocks,
} from '../engine';
import { PIECE_COLORS, BOARD_COLORS } from './colors';
import { drawBlock } from './BlockRenderer';
import { BoardRenderer } from './BoardRenderer';
import { drawActivePiece, drawGhostPiece } from './PieceRenderer';
import { AnimationManager } from './AnimationManager';
import { TextPopupManager } from './TextPopup';

const BUFFER_ROWS = BOARD_HEIGHT - VISIBLE_HEIGHT; // 20

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private boardRenderer: BoardRenderer;
  private animationManager: AnimationManager;
  private textPopupManager: TextPopupManager;
  private cellSize = 0;
  private boardPixelWidth = 0;
  private boardPixelHeight = 0;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.boardRenderer = new BoardRenderer();
    this.animationManager = new AnimationManager(eventBus);
    this.textPopupManager = new TextPopupManager(eventBus);
  }

  resize(width: number, height: number): void {
    this.cellSize = Math.floor(Math.min(width / BOARD_WIDTH, height / VISIBLE_HEIGHT));
    this.boardPixelWidth = BOARD_WIDTH * this.cellSize;
    this.boardPixelHeight = VISIBLE_HEIGHT * this.cellSize;

    // Regenerate grid cache
    this.boardRenderer.createGridCache(
      this.boardPixelWidth,
      this.boardPixelHeight,
      this.cellSize,
    );

    // Update text popup cell size
    this.textPopupManager.setCellSize(this.cellSize);
  }

  draw(snapshot: GameSnapshot, interpolation: number, deltaMs: number): void {
    const ctx = this.ctx;
    const cellSize = this.cellSize;

    if (cellSize === 0) return;

    // Update animations and popups
    this.animationManager.update(deltaMs);
    this.textPopupManager.update(deltaMs);

    // 1. Clear canvas
    ctx.fillStyle = BOARD_COLORS.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 2. Draw cached grid
    this.boardRenderer.drawCachedGrid(ctx);

    // Get rows currently being animated (to skip drawing locked blocks there)
    const animatingRows = this.animationManager.getAnimatingRows();

    // 3. Draw locked blocks (visible rows only, skip animating rows)
    for (let row = BUFFER_ROWS; row < BOARD_HEIGHT; row++) {
      // Skip rows that are being animated
      if (animatingRows.indexOf(row) !== -1) continue;

      const gridRow = snapshot.grid[row];
      if (!gridRow) continue;

      const screenRow = row - BUFFER_ROWS;

      for (let col = 0; col < BOARD_WIDTH; col++) {
        const cell = gridRow[col];
        if (cell !== null && cell !== undefined) {
          const px = col * cellSize;
          const py = screenRow * cellSize;
          const color = PIECE_COLORS[cell];
          drawBlock(ctx, px, py, cellSize, color);
        }
      }
    }

    // 4. Draw ghost piece
    if (snapshot.activePiece) {
      const ghostY = this.calculateGhostY(snapshot);
      drawGhostPiece(ctx, snapshot.activePiece, ghostY, cellSize);

      // 5. Draw active piece (with interpolation)
      drawActivePiece(ctx, snapshot.activePiece, cellSize, interpolation);
    }

    // 6. Draw line clear animations
    this.animationManager.draw(ctx, cellSize);

    // 7. Draw text popups
    this.textPopupManager.draw(ctx);
  }

  /**
   * Calculate the ghost piece Y position by dropping the active piece
   * straight down until collision.
   */
  private calculateGhostY(snapshot: GameSnapshot): number {
    const piece = snapshot.activePiece;
    if (!piece) return 0;

    const blocks = getBlocks(piece.type, piece.rotation);
    let ghostY = piece.position.y;

    // Move down until collision
    let canMove = true;
    while (canMove) {
      ghostY++;
      for (const block of blocks) {
        const absX = block.x + piece.position.x;
        const absY = block.y + ghostY;

        // Check board bounds
        if (absY >= BOARD_HEIGHT || absX < 0 || absX >= BOARD_WIDTH) {
          canMove = false;
          break;
        }

        // Check grid collision
        const gridRow = snapshot.grid[absY];
        if (gridRow) {
          const cell = gridRow[absX];
          if (cell !== null && cell !== undefined) {
            canMove = false;
            break;
          }
        }
      }
    }

    // Back up one row (the last valid position)
    return ghostY - 1;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  destroy(): void {
    this.animationManager.destroy();
    this.textPopupManager.destroy();
  }
}
