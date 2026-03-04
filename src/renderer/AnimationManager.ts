import {
  EventBus,
  GameEventType,
  type Cell,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
  BOARD_WIDTH,
} from '../engine';

const LINE_CLEAR_DURATION = 400; // ms
const FLASH_END = 150; // ms — end of flash phase
const BUFFER_ROWS = BOARD_HEIGHT - VISIBLE_HEIGHT;

interface LineClearAnimation {
  rows: number[];
  rowData: Cell[][];
  elapsed: number;
  duration: number;
}

export class AnimationManager {
  private animations: LineClearAnimation[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(eventBus: EventBus) {
    this.unsubscribe = eventBus.on(GameEventType.LINE_CLEAR, (event) => {
      // Capture the row data from the stored grid reference.
      // Note: The engine clears rows before emitting the event, so the
      // animation manager must receive the grid snapshot before the clear.
      // We store rowData from the event rows. Since the engine already cleared
      // the rows, we create placeholder white row data for the animation.
      const rowData: Cell[][] = [];
      for (let i = 0; i < event.rows.length; i++) {
        // The engine has already cleared these rows, so we reconstruct
        // a filled row for visual purposes (blocks drawn white during animation)
        const filledRow: Cell[] = [];
        for (let col = 0; col < BOARD_WIDTH; col++) {
          filledRow.push(null); // Will be drawn as white blocks during animation
        }
        rowData.push(filledRow);
      }

      this.animations.push({
        rows: [...event.rows],
        rowData,
        elapsed: 0,
        duration: LINE_CLEAR_DURATION,
      });
    });
  }

  update(deltaMs: number): void {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i]!;
      anim.elapsed += deltaMs;
      if (anim.elapsed >= anim.duration) {
        this.animations.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cellSize: number): void {
    for (const anim of this.animations) {
      for (const row of anim.rows) {
        const screenRow = row - BUFFER_ROWS;
        if (screenRow < 0) continue;

        const rowY = screenRow * cellSize;

        if (anim.elapsed < FLASH_END) {
          // Flash phase: white rect expanding from center
          const flashProgress = anim.elapsed / FLASH_END;
          const rowWidth = BOARD_WIDTH * cellSize;
          const flashWidth = rowWidth * flashProgress;
          const flashX = (rowWidth - flashWidth) / 2;
          const alpha = 0.8 - flashProgress * 0.5;

          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(flashX, rowY, flashWidth, cellSize);
          ctx.globalAlpha = 1;
        } else {
          // Dissolve phase: blocks shrink + fade, drawn white
          const dissolveProgress = (anim.elapsed - FLASH_END) / (anim.duration - FLASH_END);
          const scale = 1.0 - dissolveProgress;
          const alpha = 1.0 - dissolveProgress;

          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#FFFFFF';

          for (let col = 0; col < BOARD_WIDTH; col++) {
            const blockX = col * cellSize;
            const blockSize = cellSize * scale;
            const offsetX = (cellSize - blockSize) / 2;
            const offsetY = (cellSize - blockSize) / 2;

            ctx.fillRect(
              blockX + offsetX,
              rowY + offsetY,
              blockSize,
              blockSize,
            );
          }

          ctx.globalAlpha = 1;
        }
      }
    }
  }

  hasActiveAnimations(): boolean {
    return this.animations.length > 0;
  }

  getAnimatingRows(): number[] {
    const rows: number[] = [];
    for (const anim of this.animations) {
      for (const row of anim.rows) {
        rows.push(row);
      }
    }
    return rows;
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.animations.length = 0;
  }
}
