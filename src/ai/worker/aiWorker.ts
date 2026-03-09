import type { HeuristicWeights } from '../types';
import { findAllPlacements, findBestWithLookahead } from './PlacementSearch';

export interface PlacementResult {
  targetCol: number;
  targetRotation: number;
  useHold: boolean;
  score: number;
}

/**
 * Find the best placement for the current piece.
 * Exported for Comlink — main thread calls this as an async function.
 */
export function findBestPlacement(
  grid: (string | null)[][],
  pieceType: string,
  holdPiece: string | null,
  holdUsed: boolean,
  nextPiece: string,
  weights: HeuristicWeights,
  canUseHold: boolean,
  useLookahead: boolean,
): PlacementResult {
  // Evaluate current piece placement
  const currentBest = findBestWithLookahead(
    grid, pieceType, nextPiece, weights, useLookahead,
  );

  // Evaluate hold piece placement if available and allowed
  let holdBest: ReturnType<typeof findBestWithLookahead> = null;
  if (canUseHold && !holdUsed) {
    const holdType = holdPiece ?? nextPiece;
    const nextAfterHold = holdPiece ? nextPiece : nextPiece; // simplified
    holdBest = findBestWithLookahead(
      grid, holdType, nextAfterHold, weights, useLookahead,
    );
  }

  // Compare current vs hold
  const useHold = holdBest != null && (currentBest == null || holdBest.score > currentBest.score);
  const best = useHold ? holdBest! : currentBest;

  if (!best) {
    // No valid placement found — just hard drop in place
    return { targetCol: 3, targetRotation: 0, useHold: false, score: -Infinity };
  }

  return {
    targetCol: best.col,
    targetRotation: best.rotation,
    useHold,
    score: best.score,
  };
}

/**
 * Get all placements with scores (for mistake injection).
 */
export function getAllPlacements(
  grid: (string | null)[][],
  pieceType: string,
  weights: HeuristicWeights,
) {
  return findAllPlacements(grid, pieceType, weights);
}
