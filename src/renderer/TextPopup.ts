import {
  EventBus,
  GameEventType,
  BOARD_WIDTH,
  VISIBLE_HEIGHT,
} from '../engine';
import { TEXT_POPUP_COLORS } from './colors';

const DEFAULT_DURATION = 2000; // ms
const DEFAULT_FONT_SIZE = 24;
const DEFAULT_FLOAT_SPEED = 40; // px/sec

const FONT_FAMILY = "'Segoe UI', Arial, sans-serif";

interface TextPopupData {
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  floatSpeed: number;
  elapsed: number;
  duration: number;
}

export class TextPopupManager {
  private popups: TextPopupData[] = [];
  private unsubscribers: (() => void)[] = [];
  private cellSize = 0;

  constructor(eventBus: EventBus) {
    // Subscribe to LINE_CLEAR for quad detection
    this.unsubscribers.push(
      eventBus.on(GameEventType.LINE_CLEAR, (event) => {
        if (event.count === 4) {
          this.addPopup('QUAD', TEXT_POPUP_COLORS.quad, DEFAULT_FONT_SIZE + 4);
        } else if (event.count === 1) {
          this.addPopup('SINGLE', TEXT_POPUP_COLORS.combo, DEFAULT_FONT_SIZE - 4);
        } else if (event.count === 2) {
          this.addPopup('DOUBLE', TEXT_POPUP_COLORS.combo, DEFAULT_FONT_SIZE);
        } else if (event.count === 3) {
          this.addPopup('TRIPLE', TEXT_POPUP_COLORS.combo, DEFAULT_FONT_SIZE + 2);
        }
      }),
    );

    // Subscribe to TSPIN
    this.unsubscribers.push(
      eventBus.on(GameEventType.TSPIN, (event) => {
        const lines = event.linesCleared;
        let text = 'T-SPIN';
        if (lines === 1) text = 'T-SPIN SINGLE';
        else if (lines === 2) text = 'T-SPIN DOUBLE';
        else if (lines === 3) text = 'T-SPIN TRIPLE';
        this.addPopup(text, TEXT_POPUP_COLORS.tSpin, DEFAULT_FONT_SIZE + 4);
      }),
    );

    // Subscribe to TSPIN_MINI
    this.unsubscribers.push(
      eventBus.on(GameEventType.TSPIN_MINI, (event) => {
        const lines = event.linesCleared;
        let text = 'T-SPIN MINI';
        if (lines === 1) text = 'T-SPIN MINI SINGLE';
        else if (lines === 2) text = 'T-SPIN MINI DOUBLE';
        this.addPopup(text, TEXT_POPUP_COLORS.tSpin, DEFAULT_FONT_SIZE);
      }),
    );

    // Subscribe to COMBO
    this.unsubscribers.push(
      eventBus.on(GameEventType.COMBO, (event) => {
        if (event.count >= 2) {
          this.addPopup(
            `${event.count} COMBO`,
            TEXT_POPUP_COLORS.combo,
            DEFAULT_FONT_SIZE,
          );
        }
      }),
    );

    // Subscribe to BACK_TO_BACK
    this.unsubscribers.push(
      eventBus.on(GameEventType.BACK_TO_BACK, (_event) => {
        this.addPopup('BACK-TO-BACK', TEXT_POPUP_COLORS.backToBack, DEFAULT_FONT_SIZE);
      }),
    );

    // Subscribe to GAME_OVER for practice mode "TIME'S UP!"
    this.unsubscribers.push(
      eventBus.on(GameEventType.GAME_OVER, (event) => {
        if (event.reason === 'timeout') {
          this.addPopup("TIME'S UP!", TEXT_POPUP_COLORS.quad, DEFAULT_FONT_SIZE + 12);
        }
      }),
    );
  }

  setCellSize(cellSize: number): void {
    this.cellSize = cellSize;
  }

  private addPopup(text: string, color: string, fontSize: number): void {
    // Position at center of visible playfield
    const centerX = (BOARD_WIDTH * this.cellSize) / 2;
    const centerY = (VISIBLE_HEIGHT * this.cellSize) / 2;

    this.popups.push({
      text,
      x: centerX,
      y: centerY,
      color,
      fontSize,
      floatSpeed: DEFAULT_FLOAT_SPEED,
      elapsed: 0,
      duration: DEFAULT_DURATION,
    });
  }

  update(deltaMs: number): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i]!;
      popup.elapsed += deltaMs;
      if (popup.elapsed >= popup.duration) {
        this.popups.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const popup of this.popups) {
      const progress = Math.min(popup.elapsed / popup.duration, 1);

      // Calculate Y position (float upward)
      const floatOffset = popup.floatSpeed * (popup.elapsed / 1000);
      const drawY = popup.y - floatOffset;

      // Calculate scale based on phase
      let scale: number;
      let alpha: number;

      if (progress < 0.15) {
        // Pop-in: scale 0 -> 1.2
        scale = (progress / 0.15) * 1.2;
        alpha = 1.0;
      } else if (progress < 0.25) {
        // Settle: scale 1.2 -> 1.0
        const settleProgress = (progress - 0.15) / 0.10;
        scale = 1.2 - settleProgress * 0.2;
        alpha = 1.0;
      } else if (progress < 0.70) {
        // Normal: scale 1.0
        scale = 1.0;
        alpha = 1.0;
      } else {
        // Fade out: alpha 1.0 -> 0.0
        const fadeProgress = (progress - 0.70) / 0.30;
        scale = 1.0;
        alpha = 1.0 - fadeProgress;
      }

      ctx.save();
      ctx.translate(popup.x, drawY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      const font = `bold ${popup.fontSize}px ${FONT_FAMILY}`;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Dark outline: 4 offset draws
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const outlineOffsets: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]];
      for (const [ox, oy] of outlineOffsets) {
        ctx.fillText(popup.text, ox, oy);
      }

      // Main text fill
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, 0, 0);

      ctx.restore();
    }
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers.length = 0;
    this.popups.length = 0;
  }
}
