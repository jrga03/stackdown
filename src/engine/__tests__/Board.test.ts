import { describe, it, expect } from 'vitest';
import { Board } from '../Board';
import { PieceType } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';

describe('Board', () => {
  // 1. Board initializes as 40x10 grid of nulls
  it('initializes as 40x10 grid of nulls', () => {
    const board = new Board();
    const grid = board.getGrid();

    expect(grid.length).toBe(BOARD_HEIGHT); // 40 rows
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      expect(grid[row]!.length).toBe(BOARD_WIDTH); // 10 cols
      for (let col = 0; col < BOARD_WIDTH; col++) {
        expect(grid[row]![col]).toBeNull();
      }
    }
  });

  // 2. getCell returns null for empty cells
  it('getCell returns null for empty cells', () => {
    const board = new Board();
    expect(board.getCell(0, 0)).toBeNull();
    expect(board.getCell(39, 9)).toBeNull();
    expect(board.getCell(20, 5)).toBeNull();
  });

  // 3. isValidPosition returns true for valid empty positions
  it('isValidPosition returns true for valid empty positions', () => {
    const board = new Board();
    const blocks = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(board.isValidPosition(blocks)).toBe(true);
  });

  // 4. isValidPosition returns false for out-of-bounds left (x < 0)
  it('isValidPosition returns false for out-of-bounds left', () => {
    const board = new Board();
    const blocks = [
      { x: -1, y: 20 },
      { x: 0, y: 20 },
    ];
    expect(board.isValidPosition(blocks)).toBe(false);
  });

  // 5. isValidPosition returns false for out-of-bounds right (x >= 10)
  it('isValidPosition returns false for out-of-bounds right', () => {
    const board = new Board();
    const blocks = [
      { x: 9, y: 20 },
      { x: 10, y: 20 },
    ];
    expect(board.isValidPosition(blocks)).toBe(false);
  });

  // 6. isValidPosition returns false for out-of-bounds bottom (y >= 40)
  it('isValidPosition returns false for out-of-bounds bottom', () => {
    const board = new Board();
    const blocks = [
      { x: 0, y: 39 },
      { x: 0, y: 40 },
    ];
    expect(board.isValidPosition(blocks)).toBe(false);
  });

  // 7. isValidPosition returns false for occupied cells
  it('isValidPosition returns false for occupied cells', () => {
    const board = new Board();
    // Lock a piece at the bottom
    board.lockPiece(
      [
        { x: 0, y: 39 },
        { x: 1, y: 39 },
        { x: 2, y: 39 },
        { x: 3, y: 39 },
      ],
      PieceType.I,
    );
    // Now try to place in same positions
    const blocks = [
      { x: 0, y: 39 },
      { x: 1, y: 39 },
    ];
    expect(board.isValidPosition(blocks)).toBe(false);
  });

  // 8. lockPiece writes piece type into grid
  it('lockPiece writes piece type into grid', () => {
    const board = new Board();
    const blocks = [
      { x: 3, y: 38 },
      { x: 4, y: 38 },
      { x: 3, y: 39 },
      { x: 4, y: 39 },
    ];
    board.lockPiece(blocks, PieceType.O);
    const grid = board.getGrid();
    expect(grid[38]![3]).toBe(PieceType.O);
    expect(grid[38]![4]).toBe(PieceType.O);
    expect(grid[39]![3]).toBe(PieceType.O);
    expect(grid[39]![4]).toBe(PieceType.O);
  });

  // 9. After lockPiece, getCell returns correct type
  it('after lockPiece, getCell returns correct type', () => {
    const board = new Board();
    board.lockPiece(
      [
        { x: 5, y: 30 },
        { x: 6, y: 30 },
        { x: 7, y: 30 },
        { x: 6, y: 31 },
      ],
      PieceType.T,
    );
    expect(board.getCell(30, 5)).toBe(PieceType.T);
    expect(board.getCell(30, 6)).toBe(PieceType.T);
    expect(board.getCell(30, 7)).toBe(PieceType.T);
    expect(board.getCell(31, 6)).toBe(PieceType.T);
    // Adjacent cells should still be null
    expect(board.getCell(30, 4)).toBeNull();
    expect(board.getCell(31, 5)).toBeNull();
  });

  // 10. clearFullRows removes a single full row
  it('clearFullRows removes a single full row', () => {
    const board = new Board();
    // Fill row 39 completely
    const blocks = [];
    for (let col = 0; col < BOARD_WIDTH; col++) {
      blocks.push({ x: col, y: 39 });
    }
    board.lockPiece(blocks, PieceType.I);

    const cleared = board.clearFullRows();
    expect(cleared).toEqual([39]);

    // Row 39 should now be empty
    for (let col = 0; col < BOARD_WIDTH; col++) {
      expect(board.getCell(39, col)).toBeNull();
    }
  });

  // 11. clearFullRows removes multiple rows (2, 3, 4)
  it('clearFullRows removes 2 full rows', () => {
    const board = new Board();
    for (let row = 38; row <= 39; row++) {
      const blocks = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        blocks.push({ x: col, y: row });
      }
      board.lockPiece(blocks, PieceType.I);
    }

    const cleared = board.clearFullRows();
    expect(cleared.length).toBe(2);
    expect(cleared).toContain(38);
    expect(cleared).toContain(39);
  });

  it('clearFullRows removes 3 full rows', () => {
    const board = new Board();
    for (let row = 37; row <= 39; row++) {
      const blocks = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        blocks.push({ x: col, y: row });
      }
      board.lockPiece(blocks, PieceType.J);
    }

    const cleared = board.clearFullRows();
    expect(cleared.length).toBe(3);
    expect(cleared).toContain(37);
    expect(cleared).toContain(38);
    expect(cleared).toContain(39);
  });

  it('clearFullRows removes 4 full rows (quad)', () => {
    const board = new Board();
    for (let row = 36; row <= 39; row++) {
      const blocks = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        blocks.push({ x: col, y: row });
      }
      board.lockPiece(blocks, PieceType.L);
    }

    const cleared = board.clearFullRows();
    expect(cleared.length).toBe(4);
    expect(cleared).toContain(36);
    expect(cleared).toContain(37);
    expect(cleared).toContain(38);
    expect(cleared).toContain(39);
  });

  // 12. clearFullRows returns original row indices
  it('clearFullRows returns original row indices', () => {
    const board = new Board();
    // Fill rows 37 and 39, leave 38 partially filled
    for (const row of [37, 39]) {
      const blocks = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        blocks.push({ x: col, y: row });
      }
      board.lockPiece(blocks, PieceType.S);
    }

    const cleared = board.clearFullRows();
    // Should return the original row indices, not the shifted ones
    expect(cleared).toEqual([37, 39]);
  });

  // 13. clearFullRows shifts rows above down correctly
  it('clearFullRows shifts rows above down correctly', () => {
    const board = new Board();

    // Place a partial row at row 38 (not full)
    board.lockPiece(
      [
        { x: 0, y: 38 },
        { x: 1, y: 38 },
      ],
      PieceType.Z,
    );

    // Fill row 39 completely
    const fullRowBlocks = [];
    for (let col = 0; col < BOARD_WIDTH; col++) {
      fullRowBlocks.push({ x: col, y: 39 });
    }
    board.lockPiece(fullRowBlocks, PieceType.I);

    board.clearFullRows();

    // Row 38's content should have shifted down to row 39
    expect(board.getCell(39, 0)).toBe(PieceType.Z);
    expect(board.getCell(39, 1)).toBe(PieceType.Z);
    expect(board.getCell(39, 2)).toBeNull();

    // Row 38 should now be empty (shifted down)
    expect(board.getCell(38, 0)).toBeNull();
    expect(board.getCell(38, 1)).toBeNull();
  });

  // 14. clearFullRows with no full rows returns empty array
  it('clearFullRows with no full rows returns empty array', () => {
    const board = new Board();
    // Place some blocks but don't fill any row
    board.lockPiece(
      [
        { x: 0, y: 39 },
        { x: 1, y: 39 },
        { x: 2, y: 39 },
      ],
      PieceType.T,
    );

    const cleared = board.clearFullRows();
    expect(cleared).toEqual([]);
  });

  // Additional edge case: isValidPosition with y < 0 is out of bounds
  it('isValidPosition returns false for out-of-bounds top (y < 0)', () => {
    const board = new Board();
    const blocks = [{ x: 5, y: -1 }];
    expect(board.isValidPosition(blocks)).toBe(false);
  });

  // Edge case: empty blocks array is valid
  it('isValidPosition returns true for empty blocks array', () => {
    const board = new Board();
    expect(board.isValidPosition([])).toBe(true);
  });

  // Board.reset() clears entire board
  it('reset() clears entire board including locked pieces and garbage', () => {
    const board = new Board();

    // Lock some pieces
    board.lockPiece([{ x: 0, y: 39 }, { x: 1, y: 39 }], PieceType.T);
    // Push garbage
    board.pushGarbageRows(3);

    // Verify board is dirty
    expect(board.hasGarbage()).toBe(true);

    // Reset
    board.reset();

    // Verify fully empty
    const grid = board.getGrid();
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        expect(grid[row]![col]).toBeNull();
      }
    }
    expect(board.hasGarbage()).toBe(false);
  });
});
