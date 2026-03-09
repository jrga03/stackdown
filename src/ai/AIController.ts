import { GameAction, type GameSnapshot } from '../engine';
import { getDifficultyConfig } from './AIDifficultyConfig';
import { AIState, type AIDifficultyParams } from './types';
import type { PlacementResult } from './worker/aiWorker';

// Worker proxy type — Comlink wraps all exports as async
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AIWorkerProxy = any;

/**
 * Main-thread AI driver. Uses a Web Worker (via Comlink) for placement search.
 *
 * State machine: WAITING_FOR_PIECE → REQUEST_SENT → THINKING → EXECUTING → repeat
 */
export class AIController {
  private state = AIState.WAITING_FOR_PIECE;
  private config: AIDifficultyParams;
  private worker: AIWorkerProxy = null;

  private actionQueue: GameAction[] = [];
  private thinkTimer = 0;
  private actionTimer = 0;
  private lastPieceType: string | null = null;

  private actionCallback: (action: GameAction) => void;

  constructor(
    level: number,
    actionCallback: (action: GameAction) => void,
  ) {
    this.config = getDifficultyConfig(level);
    this.actionCallback = actionCallback;
  }

  async init(): Promise<void> {
    // Create worker with Comlink wrapping via vite-plugin-comlink
    // ComlinkWorker is a global type provided by vite-plugin-comlink/client
    const worker = new ComlinkWorker<typeof import('./worker/aiWorker')>(
      new URL('./worker/aiWorker', import.meta.url),
    );
    this.worker = worker;
  }

  /**
   * Update the AI. Called every tick from the game loop.
   */
  update(deltaMs: number, snapshot: GameSnapshot): void {
    if (snapshot.isGameOver || snapshot.isPaused) return;
    if (!snapshot.activePiece) return;

    const currentPieceType = snapshot.activePiece.type;

    switch (this.state) {
      case AIState.WAITING_FOR_PIECE:
        // New piece detected
        if (currentPieceType !== this.lastPieceType) {
          this.lastPieceType = currentPieceType;
          this.requestPlacement(snapshot);
        }
        break;

      case AIState.REQUEST_SENT:
        // Waiting for worker response (handled async)
        break;

      case AIState.THINKING:
        // Artificial thinking delay
        this.thinkTimer -= deltaMs;
        if (this.thinkTimer <= 0) {
          this.state = AIState.EXECUTING;
          this.actionTimer = 0;
        }
        break;

      case AIState.EXECUTING:
        // Execute queued actions at paced intervals
        this.actionTimer -= deltaMs;
        if (this.actionTimer <= 0 && this.actionQueue.length > 0) {
          const action = this.actionQueue.shift()!;
          this.actionCallback(action);
          this.actionTimer = this.config.actionInterval;
        }
        // All actions done
        if (this.actionQueue.length === 0) {
          this.state = AIState.WAITING_FOR_PIECE;
          this.lastPieceType = null; // Force re-evaluation on next piece
        }
        break;
    }
  }

  private async requestPlacement(snapshot: GameSnapshot): Promise<void> {
    if (!this.worker || !snapshot.activePiece) return;

    this.state = AIState.REQUEST_SENT;

    try {
      const grid = snapshot.grid;
      const pieceType = snapshot.activePiece.type;
      const holdPiece = snapshot.holdPiece;
      const holdUsed = snapshot.holdUsed;
      const nextPiece = snapshot.nextQueue[0] ?? 'T';

      // Call worker
      const result = await this.worker.findBestPlacement(
        grid,
        pieceType,
        holdPiece,
        holdUsed,
        nextPiece,
        this.config.weights,
        this.config.useHold,
        this.config.twoPieceLookahead,
      ) as PlacementResult;

      // Apply mistake injection
      let finalResult = result;
      if (Math.random() < this.config.mistakeRate) {
        const allPlacements = await this.worker.getAllPlacements(
          grid, pieceType, this.config.weights,
        );
        if (allPlacements && allPlacements.length > 1) {
          // Sort by score descending, pick from top N (excluding best)
          allPlacements.sort((a: any, b: any) => b.score - a.score);
          const topN = allPlacements.slice(0, Math.min(this.config.mistakeTopN, allPlacements.length));
          const pick = topN[Math.floor(Math.random() * topN.length)];
          if (pick) {
            finalResult = {
              targetCol: pick.col,
              targetRotation: pick.rotation,
              useHold: false,
              score: pick.score,
            };
          }
        }
      }

      this.buildActionQueue(snapshot, finalResult);

      // Set thinking delay
      const delay = this.config.thinkDelayMin +
        Math.random() * (this.config.thinkDelayMax - this.config.thinkDelayMin);
      this.thinkTimer = delay;
      this.state = AIState.THINKING;
    } catch {
      // Worker error — fall back to simple hard drop
      this.actionQueue = [GameAction.HARD_DROP];
      this.thinkTimer = 500;
      this.state = AIState.THINKING;
    }
  }

  private buildActionQueue(snapshot: GameSnapshot, result: PlacementResult): void {
    const actions: GameAction[] = [];

    // Hold if needed
    if (result.useHold) {
      actions.push(GameAction.HOLD);
    }

    // Rotations
    const targetRot = result.targetRotation;
    if (targetRot === 1) {
      actions.push(GameAction.ROTATE_CW);
    } else if (targetRot === 2) {
      actions.push(GameAction.ROTATE_CW);
      actions.push(GameAction.ROTATE_CW);
    } else if (targetRot === 3) {
      actions.push(GameAction.ROTATE_CCW);
    }

    // Horizontal movement
    if (snapshot.activePiece) {
      const currentCol = snapshot.activePiece.position.x;
      const diff = result.targetCol - currentCol;
      const moveAction = diff > 0 ? GameAction.MOVE_RIGHT : GameAction.MOVE_LEFT;
      for (let i = 0; i < Math.abs(diff); i++) {
        actions.push(moveAction);
      }
    }

    // Hard drop
    actions.push(GameAction.HARD_DROP);

    this.actionQueue = actions;
  }

  reset(): void {
    this.state = AIState.WAITING_FOR_PIECE;
    this.actionQueue = [];
    this.thinkTimer = 0;
    this.actionTimer = 0;
    this.lastPieceType = null;
  }

  destroy(): void {
    this.worker = null;
  }

  getState(): AIState {
    return this.state;
  }
}
