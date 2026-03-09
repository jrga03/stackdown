import type { HeuristicWeights } from '../types';
import { evaluateBoard } from './BoardEvaluator';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 40;

// Piece shapes: [pieceType][rotation] -> Position[]
// Mirrored from src/engine/Piece.ts for worker isolation
interface Pos { x: number; y: number }

const PIECE_SHAPES: Record<string, Pos[][]> = {
  I: [
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
    [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
  ],
  O: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  ],
  T: [
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  S: [
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  Z: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }],
  ],
  J: [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  ],
  L: [
    [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
};

export interface Placement {
  col: number;
  rotation: number;
  score: number;
}

function getBlocks(pieceType: string, rotation: number): Pos[] {
  return PIECE_SHAPES[pieceType]?.[rotation] ?? [];
}

function isValid(grid: (string | null)[][], blocks: Pos[], col: number, row: number): boolean {
  for (const b of blocks) {
    const x = b.x + col;
    const y = b.y + row;
    if (x < 0 || x >= BOARD_WIDTH) return false;
    if (y < 0 || y >= BOARD_HEIGHT) return false;
    if (grid[y]?.[x] != null) return false;
  }
  return true;
}

function dropRow(grid: (string | null)[][], blocks: Pos[], col: number): number {
  let row = 0;
  while (isValid(grid, blocks, col, row + 1)) {
    row++;
  }
  return row;
}

function simulatePlacement(
  grid: (string | null)[][],
  blocks: Pos[],
  col: number,
  row: number,
  pieceType: string,
): (string | null)[][] {
  // Clone grid (only rows that could be affected)
  const newGrid = grid.map(r => [...r]);

  // Place piece
  for (const b of blocks) {
    const x = b.x + col;
    const y = b.y + row;
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      newGrid[y]![x] = pieceType;
    }
  }

  // Clear complete lines
  const result: (string | null)[][] = [];
  let cleared = 0;
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    const gridRow = newGrid[r]!;
    let full = true;
    let allGarbage = true;
    for (let c = 0; c < BOARD_WIDTH; c++) {
      if (gridRow[c] == null) { full = false; break; }
      if (gridRow[c] !== 'GARBAGE') allGarbage = false;
    }
    if (full && !allGarbage) {
      cleared++;
    } else {
      result.push(gridRow);
    }
  }
  // Add empty rows at top
  for (let i = 0; i < cleared; i++) {
    result.unshift(new Array(BOARD_WIDTH).fill(null) as (string | null)[]);
  }

  return result;
}

/**
 * Find all valid placements for a piece using slide-and-drop.
 * For each rotation, tries all columns and drops.
 */
export function findAllPlacements(
  grid: (string | null)[][],
  pieceType: string,
  weights: HeuristicWeights,
): Placement[] {
  const placements: Placement[] = [];
  const rotations = pieceType === 'O' ? 1 : 4;

  for (let rot = 0; rot < rotations; rot++) {
    const blocks = getBlocks(pieceType, rot);
    if (blocks.length === 0) continue;

    // Determine valid column range
    let minX = BOARD_WIDTH;
    let maxX = 0;
    for (const b of blocks) {
      if (b.x < minX) minX = b.x;
      if (b.x > maxX) maxX = b.x;
    }

    const colMin = -minX;
    const colMax = BOARD_WIDTH - 1 - maxX;

    for (let col = colMin; col <= colMax; col++) {
      // Check if starting position is valid (above board)
      if (!isValid(grid, blocks, col, 0)) continue;

      const row = dropRow(grid, blocks, col);
      const resultGrid = simulatePlacement(grid, blocks, col, row, pieceType);
      const score = evaluateBoard(resultGrid, weights);

      placements.push({ col, rotation: rot, score });
    }
  }

  return placements;
}

/**
 * Find the best placement considering the current piece and optionally
 * the next piece (two-piece lookahead).
 */
export function findBestWithLookahead(
  grid: (string | null)[][],
  pieceType: string,
  nextPiece: string,
  weights: HeuristicWeights,
  useLookahead: boolean,
): Placement | null {
  const placements = findAllPlacements(grid, pieceType, weights);
  if (placements.length === 0) return null;

  if (!useLookahead) {
    // Just return the best single placement
    placements.sort((a, b) => b.score - a.score);
    return placements[0] ?? null;
  }

  // Two-piece lookahead: for each placement, simulate and evaluate with next piece
  let bestPlacement: Placement | null = null;
  let bestCombinedScore = -Infinity;

  for (const p of placements) {
    const blocks = getBlocks(pieceType, p.rotation);
    const row = dropRow(grid, blocks, p.col);
    const resultGrid = simulatePlacement(grid, blocks, p.col, row, pieceType);

    const nextPlacements = findAllPlacements(resultGrid, nextPiece, weights);
    const bestNext = nextPlacements.length > 0
      ? Math.max(...nextPlacements.map(np => np.score))
      : 0;

    const combinedScore = p.score + bestNext * 0.5;
    if (combinedScore > bestCombinedScore) {
      bestCombinedScore = combinedScore;
      bestPlacement = { ...p, score: combinedScore };
    }
  }

  return bestPlacement;
}
