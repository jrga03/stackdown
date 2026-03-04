import {
  PieceType,
  RotationState,
  GameAction,
  GameMode,
  GameEventType,
  ActivePieceState,
  GameSnapshot,
  Position,
  Grid,
} from './types';
import {
  SPAWN_ROW,
  LOCK_DELAY_MS,
  PRACTICE_DURATION_MS,
} from './constants';
import { Board } from './Board';
import { getBlocks } from './Piece';
import { tryRotation } from './SRS';
import { Randomizer } from './Randomizer';
import { EventBus } from './EventBus';
import { GravityTimer } from './GravityTimer';
import { LockDelay } from './LockDelay';
import { detectTSpin } from './TSpinDetector';
import { ScoreManager } from './ScoreManager';
import { ComboTracker } from './ComboTracker';

const NEXT_QUEUE_SIZE = 5;
const SPAWN_X = 3;

export class GameEngine {
  private board: Board;
  private randomizer: Randomizer;
  private eventBus: EventBus;
  private gravityTimer: GravityTimer;
  private lockDelay: LockDelay;
  private scoreManager: ScoreManager;
  private comboTracker: ComboTracker;

  private activePiece: ActivePieceState | null = null;
  private holdPiece: PieceType | null = null;
  private holdUsed = false;

  private isPaused = false;
  private isGameOver = false;
  private elapsedMs = 0;

  private gridDirty = true;
  private cachedGridCopy: Grid | null = null;

  private gameMode: GameMode;
  private remainingMs: number | null;
  private timeWarningEmitted = false;

  constructor(
    eventBus: EventBus,
    options?: {
      seed?: number;
      mode?: GameMode;
      startLevel?: number;
    },
  ) {
    this.eventBus = eventBus;
    this.gameMode = options?.mode ?? GameMode.MARATHON;
    const startLevel = options?.startLevel ?? 1;

    this.board = new Board();
    this.randomizer = new Randomizer(options?.seed);
    this.gravityTimer = new GravityTimer();
    this.lockDelay = new LockDelay();
    this.comboTracker = new ComboTracker();

    if (this.gameMode === GameMode.PRACTICE) {
      this.scoreManager = new ScoreManager({
        startLevel,
        fixedLevel: true,
      });
      this.remainingMs = PRACTICE_DURATION_MS;
    } else {
      this.scoreManager = new ScoreManager({ startLevel });
      this.remainingMs = null;
    }

    // Spawn first piece
    this.spawnPiece();
  }

  tick(deltaMs: number): void {
    if (this.isPaused || this.isGameOver) return;

    // Update elapsed time
    this.elapsedMs += deltaMs;

    // Practice mode timer
    if (this.gameMode === GameMode.PRACTICE && this.remainingMs !== null) {
      this.remainingMs -= deltaMs;

      // Time warning at 10s
      if (!this.timeWarningEmitted && this.remainingMs <= 10000) {
        this.timeWarningEmitted = true;
        this.eventBus.emit(GameEventType.TIME_WARNING, {
          remainingMs: this.remainingMs,
        });
      }

      // Timeout
      if (this.remainingMs <= 0) {
        this.remainingMs = 0;
        this.triggerGameOver('timeout');
        return;
      }
    }

    if (!this.activePiece) return;

    // Apply gravity
    const level = this.scoreManager.getLevel();
    const drops = this.gravityTimer.tick(deltaMs, level);
    for (let i = 0; i < drops; i++) {
      if (!this.activePiece) break;
      const moved = this.tryMovePiece(0, 1);
      if (!moved) {
        // Piece is on surface, activate lock delay if not already active
        if (!this.lockDelay.isActive()) {
          this.lockDelay.start();
        }
        break;
      }
    }

    // Process lock delay
    if (this.activePiece && this.lockDelay.isActive()) {
      const shouldLock = this.lockDelay.tick(deltaMs);
      if (shouldLock) {
        this.lockActivePiece();
      }
    }
  }

  applyAction(action: GameAction): void {
    // PAUSE can be toggled even during game over? No, spec says no-op when game over.
    // But PAUSE toggle should work always except game over.
    if (action === GameAction.PAUSE) {
      if (this.isGameOver) return;
      this.isPaused = !this.isPaused;
      return;
    }

    if (this.isPaused || this.isGameOver) return;
    if (!this.activePiece) return;

    switch (action) {
      case GameAction.MOVE_LEFT:
        this.handleMove(-1, 0);
        break;
      case GameAction.MOVE_RIGHT:
        this.handleMove(1, 0);
        break;
      case GameAction.SOFT_DROP:
        this.handleSoftDrop();
        break;
      case GameAction.HARD_DROP:
        this.handleHardDrop();
        break;
      case GameAction.ROTATE_CW:
        this.handleRotation('cw');
        break;
      case GameAction.ROTATE_CCW:
        this.handleRotation('ccw');
        break;
      case GameAction.ROTATE_180:
        this.handleRotation('180');
        break;
      case GameAction.HOLD:
        this.handleHold();
        break;
    }
  }

  getSnapshot(): GameSnapshot {
    if (this.gridDirty || !this.cachedGridCopy) {
      this.cachedGridCopy = this.board.getGrid().map((row) => [...row]);
      this.gridDirty = false;
    }
    const gridCopy = this.cachedGridCopy;

    let activePieceCopy: ActivePieceState | null = null;
    if (this.activePiece) {
      activePieceCopy = {
        type: this.activePiece.type,
        position: { ...this.activePiece.position },
        rotation: this.activePiece.rotation,
        lockDelayRemaining: this.activePiece.lockDelayRemaining,
        moveResetCount: this.activePiece.moveResetCount,
        lastActionWasRotation: this.activePiece.lastActionWasRotation,
        lastKickIndex: this.activePiece.lastKickIndex,
      };
    }

    return {
      grid: gridCopy,
      activePiece: activePieceCopy,
      holdPiece: this.holdPiece,
      holdUsed: this.holdUsed,
      nextQueue: this.randomizer.peek(NEXT_QUEUE_SIZE),
      score: this.scoreManager.getScore(),
      level: this.scoreManager.getLevel(),
      linesCleared: this.scoreManager.getLinesCleared(),
      combo: this.comboTracker.getCombo(),
      backToBack: this.scoreManager.getBackToBack(),
      isGameOver: this.isGameOver,
      isPaused: this.isPaused,
      elapsedMs: this.elapsedMs,
      gameMode: this.gameMode,
      remainingMs: this.remainingMs,
    };
  }

  // ── Private Methods ──

  private spawnPiece(): void {
    const type = this.randomizer.next();
    const position: Position = { x: SPAWN_X, y: SPAWN_ROW };

    // Check if spawn position is valid
    const blocks = getBlocks(type, RotationState.SPAWN);
    const absoluteBlocks = blocks.map((b) => ({
      x: b.x + position.x,
      y: b.y + position.y,
    }));

    if (!this.board.isValidPosition(absoluteBlocks)) {
      this.triggerGameOver('topout');
      return;
    }

    this.activePiece = {
      type,
      position,
      rotation: RotationState.SPAWN,
      lockDelayRemaining: LOCK_DELAY_MS,
      moveResetCount: 0,
      lastActionWasRotation: false,
      lastKickIndex: 0,
    };

    this.holdUsed = false;
    this.gravityTimer.reset();
    this.lockDelay.deactivate();

    this.eventBus.emit(GameEventType.PIECE_SPAWNED, { type });
  }

  private handleMove(dx: number, _dy: number): void {
    if (!this.activePiece) return;

    const moved = this.tryMovePiece(dx, 0);
    if (moved) {
      this.activePiece.lastActionWasRotation = false;

      const direction = dx < 0 ? 'left' : 'right';
      this.eventBus.emit(GameEventType.PIECE_MOVED, {
        direction: direction as 'left' | 'right',
      });

      // If piece is on surface, reset lock delay
      if (this.isPieceOnSurface()) {
        this.lockDelay.reset();
      } else {
        // Piece moved off surface
        this.lockDelay.deactivate();
      }
    }
  }

  private handleSoftDrop(): void {
    if (!this.activePiece) return;

    const moved = this.tryMovePiece(0, 1);
    if (moved) {
      this.scoreManager.addDropPoints(1, false);
      this.gravityTimer.reset();
      this.activePiece.lastActionWasRotation = false;

      this.eventBus.emit(GameEventType.PIECE_MOVED, { direction: 'down' });

      // Check if piece is now on surface
      if (this.isPieceOnSurface()) {
        if (!this.lockDelay.isActive()) {
          this.lockDelay.start();
        }
      } else {
        this.lockDelay.deactivate();
      }
    }
  }

  private handleHardDrop(): void {
    if (!this.activePiece) return;

    let dropDistance = 0;
    while (this.tryMovePiece(0, 1)) {
      dropDistance++;
    }

    this.scoreManager.addDropPoints(dropDistance, true);

    // Emit hard drop impact event
    if (this.activePiece) {
      const blocks = this.getAbsoluteBlocks();
      // Find the lowest row and the column for impact
      let lowestRow = 0;
      let impactCol = 0;
      for (const block of blocks) {
        if (block.y > lowestRow) {
          lowestRow = block.y;
          impactCol = block.x;
        }
      }

      this.eventBus.emit(GameEventType.HARD_DROP_IMPACT, {
        column: impactCol,
        row: lowestRow,
        distance: dropDistance,
      });
    }

    // Lock immediately (bypass lock delay)
    this.lockActivePiece();
  }

  private handleRotation(direction: 'cw' | 'ccw' | '180'): void {
    if (!this.activePiece) return;

    const result = tryRotation(this.board, this.activePiece, direction);
    if (result) {
      this.activePiece.position = result.position;
      this.activePiece.rotation = result.rotation;
      this.activePiece.lastKickIndex = result.kickIndex;
      this.activePiece.lastActionWasRotation = true;

      this.eventBus.emit(GameEventType.PIECE_ROTATED, {
        direction,
        kickIndex: result.kickIndex,
      });

      // If piece is on surface, reset lock delay
      if (this.isPieceOnSurface()) {
        this.lockDelay.reset();
      } else {
        // Piece moved off surface after rotation
        this.lockDelay.deactivate();
      }
    }
  }

  private handleHold(): void {
    if (!this.activePiece || this.holdUsed) return;

    const currentType = this.activePiece.type;
    const previousHeld = this.holdPiece;

    this.eventBus.emit(GameEventType.PIECE_HELD, {
      heldPiece: currentType,
      previousHeld,
    });

    if (this.holdPiece !== null) {
      // Swap with held piece
      const heldType = this.holdPiece;
      this.holdPiece = currentType;

      // Spawn the previously held piece
      const position: Position = { x: SPAWN_X, y: SPAWN_ROW };
      const blocks = getBlocks(heldType, RotationState.SPAWN);
      const absoluteBlocks = blocks.map((b) => ({
        x: b.x + position.x,
        y: b.y + position.y,
      }));

      if (!this.board.isValidPosition(absoluteBlocks)) {
        this.triggerGameOver('topout');
        return;
      }

      this.activePiece = {
        type: heldType,
        position,
        rotation: RotationState.SPAWN,
        lockDelayRemaining: LOCK_DELAY_MS,
        moveResetCount: 0,
        lastActionWasRotation: false,
        lastKickIndex: 0,
      };
    } else {
      // Hold current piece, spawn next from queue
      this.holdPiece = currentType;
      this.activePiece = null;
      this.spawnPiece();
    }

    this.holdUsed = true;
    this.gravityTimer.reset();
    this.lockDelay.deactivate();
  }

  private lockActivePiece(): void {
    if (!this.activePiece) return;

    const blocks = this.getAbsoluteBlocks();
    const piece = this.activePiece;

    // Lock the piece onto the board
    this.board.lockPiece(blocks, piece.type);
    this.gridDirty = true;

    this.eventBus.emit(GameEventType.PIECE_LOCKED, {
      type: piece.type,
      position: { ...piece.position },
    });

    // Detect T-Spin before clearing rows
    const tSpinResult = detectTSpin(this.board, piece);

    // Clear full rows
    const clearedRows = this.board.clearFullRows();

    if (clearedRows.length > 0) {
      // Line clear
      this.comboTracker.onLineClear();
      const combo = this.comboTracker.getCombo();

      const isTSpin = tSpinResult === 'proper';
      const isTSpinMini = tSpinResult === 'mini';

      const pointsAwarded = this.scoreManager.processLineClear(
        clearedRows.length,
        isTSpin || isTSpinMini,
        isTSpinMini,
        combo,
      );

      this.eventBus.emit(GameEventType.LINE_CLEAR, {
        type: GameEventType.LINE_CLEAR,
        rows: clearedRows,
        count: clearedRows.length,
        isTSpin,
        isTSpinMini,
        isBackToBack: this.scoreManager.getBackToBack(),
        combo,
        pointsAwarded,
      });

      // T-Spin events
      if (isTSpin) {
        this.eventBus.emit(GameEventType.TSPIN, {
          mini: false,
          linesCleared: clearedRows.length,
        });
      } else if (isTSpinMini) {
        this.eventBus.emit(GameEventType.TSPIN_MINI, {
          mini: true,
          linesCleared: clearedRows.length,
        });
      }

      // Combo event
      if (combo > 0) {
        const comboPoints = combo * 50 * this.scoreManager.getLevel();
        this.eventBus.emit(GameEventType.COMBO, {
          count: combo,
          pointsAwarded: comboPoints,
        });
      }

      // Check level up
      const newLevel = this.scoreManager.checkLevelUp();
      if (newLevel !== null) {
        this.eventBus.emit(GameEventType.LEVEL_UP, { newLevel });
      }
    } else {
      // No lines cleared
      this.comboTracker.onPieceLocked();

      // T-Spin with no lines still awards points
      if (tSpinResult === 'proper') {
        this.scoreManager.processTSpinNoLines(false);
        this.eventBus.emit(GameEventType.TSPIN, {
          mini: false,
          linesCleared: 0,
        });
      } else if (tSpinResult === 'mini') {
        this.scoreManager.processTSpinNoLines(true);
        this.eventBus.emit(GameEventType.TSPIN_MINI, {
          mini: true,
          linesCleared: 0,
        });
      }
    }

    // Clear active piece and spawn next
    this.activePiece = null;
    this.lockDelay.deactivate();
    this.spawnPiece();
  }

  private tryMovePiece(dx: number, dy: number): boolean {
    if (!this.activePiece) return false;

    const newPosition: Position = {
      x: this.activePiece.position.x + dx,
      y: this.activePiece.position.y + dy,
    };

    const blocks = getBlocks(this.activePiece.type, this.activePiece.rotation);
    const absoluteBlocks = blocks.map((b) => ({
      x: b.x + newPosition.x,
      y: b.y + newPosition.y,
    }));

    if (this.board.isValidPosition(absoluteBlocks)) {
      this.activePiece.position = newPosition;
      return true;
    }

    return false;
  }

  private isPieceOnSurface(): boolean {
    if (!this.activePiece) return false;

    const belowPosition: Position = {
      x: this.activePiece.position.x,
      y: this.activePiece.position.y + 1,
    };

    const blocks = getBlocks(this.activePiece.type, this.activePiece.rotation);
    const absoluteBlocks = blocks.map((b) => ({
      x: b.x + belowPosition.x,
      y: b.y + belowPosition.y,
    }));

    return !this.board.isValidPosition(absoluteBlocks);
  }

  private getAbsoluteBlocks(): Position[] {
    if (!this.activePiece) return [];

    const blocks = getBlocks(this.activePiece.type, this.activePiece.rotation);
    return blocks.map((b) => ({
      x: b.x + this.activePiece!.position.x,
      y: b.y + this.activePiece!.position.y,
    }));
  }

  private triggerGameOver(reason: 'topout' | 'timeout'): void {
    this.isGameOver = true;
    this.activePiece = null;
    this.eventBus.emit(GameEventType.GAME_OVER, {
      finalScore: this.scoreManager.getScore(),
      linesCleared: this.scoreManager.getLinesCleared(),
      reason,
    });
  }
}
