import { describe, it, expect } from 'vitest';
import { detectTSpin } from '../TSpinDetector';
import { Board } from '../Board';
import { PieceType, RotationState, ActivePieceState } from '../types';


/** Helper to create an ActivePieceState with sensible defaults. */
function makePiece(overrides: Partial<ActivePieceState> = {}): ActivePieceState {
  return {
    type: PieceType.T,
    position: { x: 4, y: 20 },
    rotation: RotationState.SPAWN,
    lockDelayRemaining: 500,
    moveResetCount: 0,
    lastActionWasRotation: true,
    lastKickIndex: 0,
    ...overrides,
  };
}

/**
 * Helper to fill specific cells on a board.
 * Accepts an array of [row, col] pairs.
 */
function fillCells(board: Board, cells: [number, number][]): void {
  for (const [row, col] of cells) {
    board.lockPiece([{ x: col, y: row }], PieceType.S);
  }
}

describe('TSpinDetector', () => {
  // 1. Returns 'none' for non-T piece
  it('returns none for non-T piece (e.g., I piece)', () => {
    const board = new Board();
    const piece = makePiece({ type: PieceType.I });
    expect(detectTSpin(board, piece)).toBe('none');
  });

  // 2. Returns 'none' if lastActionWasRotation is false
  it('returns none if lastActionWasRotation is false', () => {
    const board = new Board();
    const piece = makePiece({ lastActionWasRotation: false });
    expect(detectTSpin(board, piece)).toBe('none');
  });

  // 3. Returns 'none' if fewer than 3 corners occupied (T in open space)
  it('returns none if fewer than 3 corners occupied', () => {
    const board = new Board();
    // T piece in the middle of an empty board — 0 corners occupied
    const piece = makePiece({ position: { x: 4, y: 20 } });
    expect(detectTSpin(board, piece)).toBe('none');
  });

  // 4. Returns 'proper' when 3+ corners and both front corners filled (SPAWN state)
  it('returns proper when 3+ corners and both front corners filled (SPAWN)', () => {
    const board = new Board();
    // T piece at position (4, 20) with SPAWN rotation
    // Center is at (5, 21)
    // Front corners for SPAWN = A (top-left) and B (top-right)
    //   A = (4, 20), B = (6, 20)
    // Also need a third corner: C = (4, 22) or D = (6, 22)
    fillCells(board, [
      [20, 4], // A: top-left corner
      [20, 6], // B: top-right corner
      [22, 4], // C: bottom-left corner
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.SPAWN,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  // 5. Returns 'mini' when 3+ corners and only one front corner filled
  it('returns mini when 3+ corners and only one front corner filled', () => {
    const board = new Board();
    // T piece at position (4, 20) with SPAWN rotation
    // Center is at (5, 21)
    // Front corners for SPAWN = A (4,20) and B (6,20)
    // Fill only one front corner (A) and both back corners (C, D)
    fillCells(board, [
      [20, 4], // A: top-left (front)
      [22, 4], // C: bottom-left (back)
      [22, 6], // D: bottom-right (back)
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.SPAWN,
    });
    expect(detectTSpin(board, piece)).toBe('mini');
  });

  // 6. Returns 'proper' when kickIndex is 4 regardless of front corners
  it('returns proper when lastKickIndex is 4 regardless of front corners', () => {
    const board = new Board();
    // Fill 3 corners but only back corners (not both front)
    // For SPAWN: front = A, B. Fill only A (one front) + C + D (both back)
    // Normally this would be 'mini', but kickIndex 4 forces 'proper'
    fillCells(board, [
      [20, 4], // A: top-left (one front)
      [22, 4], // C: bottom-left (back)
      [22, 6], // D: bottom-right (back)
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.SPAWN,
      lastKickIndex: 4,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  // 7. Wall/floor counts as occupied (piece against wall)
  it('wall counts as occupied corner', () => {
    const board = new Board();
    // Place T piece at left wall: position (0, 20)
    // Center = (1, 21)
    // A = (0, 20) - in bounds, need to fill
    // C = (0, 22) - in bounds, need to fill
    // B = (2, 20) - in bounds
    // D = (2, 22) - in bounds
    // Let's instead place against left wall: position (-1, 20)
    // Center = (0, 21)
    // A = (-1, 20) - col -1, out of bounds left → occupied
    // C = (-1, 22) - col -1, out of bounds left → occupied
    // B = (1, 20) - in bounds, fill it
    // D = (1, 22) - in bounds
    // That gives us 3 occupied (A, C, B). Front corners for SPAWN = A, B → both occupied → proper
    fillCells(board, [
      [20, 1], // B: (1, 20) → grid[20][1]
    ]);
    const piece = makePiece({
      position: { x: -1, y: 20 },
      rotation: RotationState.SPAWN,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  it('floor counts as occupied corner', () => {
    const board = new Board();
    // Place T piece near floor: position (4, 38)
    // Center = (5, 39) — row 39 is the last row
    // C = (4, 40) - row 40, out of bounds (floor) → occupied
    // D = (6, 40) - row 40, out of bounds (floor) → occupied
    // A = (4, 38) - in bounds, fill it
    // B = (6, 38) - in bounds
    // 3 corners occupied: C, D, A. Front corners for SPAWN = A, B. Only A → mini
    fillCells(board, [
      [38, 4], // A: grid[38][4]
    ]);
    const piece = makePiece({
      position: { x: 4, y: 38 },
      rotation: RotationState.SPAWN,
    });
    // C and D are floor (occupied), A is filled → 3 corners.
    // Front = A (occupied), B (not occupied) → mini
    expect(detectTSpin(board, piece)).toBe('mini');
  });

  // 8. Above-board (y < 0) counts as NOT occupied
  it('above-board (y < 0) counts as NOT occupied', () => {
    const board = new Board();
    // Place T piece high up: position (4, -1)
    // Center = (5, 0)
    // A = (4, -1) - y < 0 → NOT occupied
    // B = (6, -1) - y < 0 → NOT occupied
    // C = (4, 1) - in bounds, fill it
    // D = (6, 1) - in bounds, fill it
    // Only 2 occupied (C, D) → 'none'
    fillCells(board, [
      [1, 4], // C: grid[1][4]
      [1, 6], // D: grid[1][6]
    ]);
    const piece = makePiece({
      position: { x: 4, y: -1 },
      rotation: RotationState.SPAWN,
    });
    expect(detectTSpin(board, piece)).toBe('none');
  });

  // 9. Different rotation states correctly identify front corners

  it('returns proper for RIGHT rotation with both front corners filled', () => {
    const board = new Board();
    // T piece at (4, 20), RIGHT rotation
    // Center = (5, 21)
    // Front corners for RIGHT = B (top-right) and D (bottom-right)
    //   B = (6, 20), D = (6, 22)
    // Fill B, D (front), and A (back) for 3 corners
    fillCells(board, [
      [20, 6], // B: grid[20][6]
      [22, 6], // D: grid[22][6]
      [20, 4], // A: grid[20][4]
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.RIGHT,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  it('returns mini for RIGHT rotation with only one front corner filled', () => {
    const board = new Board();
    // Front corners for RIGHT = B (6,20) and D (6,22)
    // Fill B (one front) + A + C (both back) for 3 corners
    fillCells(board, [
      [20, 6], // B: front
      [20, 4], // A: back
      [22, 4], // C: back
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.RIGHT,
    });
    expect(detectTSpin(board, piece)).toBe('mini');
  });

  it('returns proper for FLIP rotation with both front corners filled', () => {
    const board = new Board();
    // T piece at (4, 20), FLIP rotation
    // Center = (5, 21)
    // Front corners for FLIP = C (bottom-left) and D (bottom-right)
    //   C = (4, 22), D = (6, 22)
    // Fill C, D (front) + A (back)
    fillCells(board, [
      [22, 4], // C: grid[22][4]
      [22, 6], // D: grid[22][6]
      [20, 4], // A: grid[20][4]
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.FLIP,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  it('returns mini for FLIP rotation with only one front corner filled', () => {
    const board = new Board();
    // Front corners for FLIP = C (4,22) and D (6,22)
    // Fill C (one front) + A + B (both back)
    fillCells(board, [
      [22, 4], // C: front
      [20, 4], // A: back
      [20, 6], // B: back
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.FLIP,
    });
    expect(detectTSpin(board, piece)).toBe('mini');
  });

  it('returns proper for LEFT rotation with both front corners filled', () => {
    const board = new Board();
    // T piece at (4, 20), LEFT rotation
    // Center = (5, 21)
    // Front corners for LEFT = A (top-left) and C (bottom-left)
    //   A = (4, 20), C = (4, 22)
    // Fill A, C (front) + B (back)
    fillCells(board, [
      [20, 4], // A: grid[20][4]
      [22, 4], // C: grid[22][4]
      [20, 6], // B: grid[20][6]
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.LEFT,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  it('returns mini for LEFT rotation with only one front corner filled', () => {
    const board = new Board();
    // Front corners for LEFT = A (4,20) and C (4,22)
    // Fill A (one front) + B + D (both back)
    fillCells(board, [
      [20, 4], // A: front
      [20, 6], // B: back
      [22, 6], // D: back
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.LEFT,
    });
    expect(detectTSpin(board, piece)).toBe('mini');
  });

  // Additional edge case: all 4 corners occupied
  it('returns proper when all 4 corners occupied and both front corners filled', () => {
    const board = new Board();
    fillCells(board, [
      [20, 4], // A
      [20, 6], // B
      [22, 4], // C
      [22, 6], // D
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.SPAWN,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  // Edge: exactly 3 corners occupied with no front corners filled — impossible since
  // 3 of 4 must be occupied meaning at least 1 front corner is filled (only 2 back corners exist).
  // But let's confirm the logic is sound: if SPAWN front = A,B and we fill C,D + right wall...
  it('returns proper with kickIndex 4 even if only one front corner occupied', () => {
    const board = new Board();
    // For SPAWN: front = A, B
    // Fill C, D (back) + A (one front) = 3 corners
    fillCells(board, [
      [22, 4], // C
      [22, 6], // D
      [20, 4], // A (one front)
    ]);
    const piece = makePiece({
      position: { x: 4, y: 20 },
      rotation: RotationState.SPAWN,
      lastKickIndex: 4,
    });
    expect(detectTSpin(board, piece)).toBe('proper');
  });

  // Test all non-T piece types return 'none'
  it.each([PieceType.I, PieceType.O, PieceType.S, PieceType.Z, PieceType.J, PieceType.L])(
    'returns none for %s piece',
    (pieceType) => {
      const board = new Board();
      const piece = makePiece({ type: pieceType });
      expect(detectTSpin(board, piece)).toBe('none');
    },
  );
});
