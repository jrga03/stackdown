import type { HeuristicWeights } from '../types';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 40;

/**
 * Evaluate a board state using weighted heuristics.
 * Lower scores are better (penalties are positive).
 */
export function evaluateBoard(
  grid: (string | null)[][],
  weights: HeuristicWeights,
): number {
  const heights = getColumnHeights(grid);

  let score = 0;

  score -= weights.height * aggregateHeight(heights);
  score += weights.lines * countCompleteLines(grid);
  score -= weights.holes * countHoles(grid, heights);
  score -= weights.bumpiness * computeBumpiness(heights);
  score += weights.well * computeWellScore(heights);
  score += weights.tspin * countTSpinSlots(grid, heights);

  return score;
}

function getColumnHeights(grid: (string | null)[][]): number[] {
  const heights: number[] = new Array(BOARD_WIDTH).fill(0) as number[];
  for (let col = 0; col < BOARD_WIDTH; col++) {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (grid[row]?.[col] != null) {
        heights[col] = BOARD_HEIGHT - row;
        break;
      }
    }
  }
  return heights;
}

function aggregateHeight(heights: number[]): number {
  let total = 0;
  for (const h of heights) {
    total += h;
  }
  return total;
}

function countCompleteLines(grid: (string | null)[][]): number {
  let count = 0;
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    const gridRow = grid[row];
    if (!gridRow) continue;
    let full = true;
    let allGarbage = true;
    for (let col = 0; col < BOARD_WIDTH; col++) {
      if (gridRow[col] == null) {
        full = false;
        break;
      }
      if (gridRow[col] !== 'GARBAGE') {
        allGarbage = false;
      }
    }
    if (full && !allGarbage) count++;
  }
  return count;
}

function countHoles(grid: (string | null)[][], heights: number[]): number {
  let holes = 0;
  for (let col = 0; col < BOARD_WIDTH; col++) {
    const topRow = BOARD_HEIGHT - heights[col]!;
    for (let row = topRow + 1; row < BOARD_HEIGHT; row++) {
      if (grid[row]?.[col] == null) holes++;
    }
  }
  return holes;
}

function computeBumpiness(heights: number[]): number {
  let bump = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    bump += Math.abs(heights[i]! - heights[i + 1]!);
  }
  return bump;
}

function computeWellScore(heights: number[]): number {
  let maxDepth = 0;
  for (let col = 0; col < BOARD_WIDTH; col++) {
    const leftH = col > 0 ? heights[col - 1]! : BOARD_HEIGHT;
    const rightH = col < BOARD_WIDTH - 1 ? heights[col + 1]! : BOARD_HEIGHT;
    const depth = Math.min(leftH, rightH) - heights[col]!;
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

function countTSpinSlots(grid: (string | null)[][], heights: number[]): number {
  let slots = 0;
  // Simple heuristic: look for T-shaped openings
  for (let col = 1; col < BOARD_WIDTH - 1; col++) {
    const h = heights[col]!;
    const leftH = heights[col - 1]!;
    const rightH = heights[col + 1]!;
    // Column is lower than both neighbors by at least 2
    if (leftH - h >= 2 && rightH - h >= 2) {
      const row = BOARD_HEIGHT - h;
      // Check that the row above is blocked on both sides
      if (row > 0 && grid[row - 1]?.[col - 1] != null && grid[row - 1]?.[col + 1] != null) {
        slots++;
      }
    }
  }
  return slots;
}
