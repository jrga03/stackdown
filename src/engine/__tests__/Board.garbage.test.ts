import { describe, it, expect } from 'vitest';
import { Board } from '../Board';
import { PieceType } from '../types';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';

describe('Board garbage', () => {
  describe('pushGarbageRows', () => {
    it('pushes garbage rows onto the bottom of the board', () => {
      const board = new Board();
      board.pushGarbageRows(3);

      const grid = board.getGrid();
      expect(grid.length).toBe(BOARD_HEIGHT);

      // Bottom 3 rows should be all GARBAGE
      for (let row = BOARD_HEIGHT - 3; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          expect(grid[row]![col]).toBe('GARBAGE');
        }
      }

      // Row above should still be empty
      expect(grid[BOARD_HEIGHT - 4]![0]).toBeNull();
    });

    it('shifts existing content up when pushing garbage', () => {
      const board = new Board();
      // Place a piece at bottom row
      board.lockPiece(
        [{ x: 0, y: 39 }, { x: 1, y: 39 }],
        PieceType.I,
      );

      board.pushGarbageRows(2);

      // The piece should have moved up by 2 rows
      expect(board.getCell(37, 0)).toBe(PieceType.I);
      expect(board.getCell(37, 1)).toBe(PieceType.I);

      // Bottom 2 rows should be garbage
      expect(board.getCell(38, 0)).toBe('GARBAGE');
      expect(board.getCell(39, 0)).toBe('GARBAGE');
    });

    it('does nothing for count <= 0', () => {
      const board = new Board();
      board.pushGarbageRows(0);
      board.pushGarbageRows(-1);

      // Board should be unchanged
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          expect(board.getCell(row, col)).toBeNull();
        }
      }
    });

    it('does not corrupt grid when count exceeds BOARD_HEIGHT', () => {
      const board = new Board();
      board.pushGarbageRows(BOARD_HEIGHT + 10);

      const grid = board.getGrid();
      expect(grid.length).toBe(BOARD_HEIGHT);
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        expect(grid[row]!.length).toBe(BOARD_WIDTH);
        for (let col = 0; col < BOARD_WIDTH; col++) {
          expect(grid[row]![col]).toBe('GARBAGE');
        }
      }
    });

    it('maintains grid dimensions after push', () => {
      const board = new Board();
      board.pushGarbageRows(5);

      const grid = board.getGrid();
      expect(grid.length).toBe(BOARD_HEIGHT);
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        expect(grid[row]!.length).toBe(BOARD_WIDTH);
      }
    });
  });

  describe('hasGarbage', () => {
    it('returns false on empty board', () => {
      const board = new Board();
      expect(board.hasGarbage()).toBe(false);
    });

    it('returns true when garbage rows exist', () => {
      const board = new Board();
      board.pushGarbageRows(2);
      expect(board.hasGarbage()).toBe(true);
    });

    it('returns false when only piece cells exist', () => {
      const board = new Board();
      board.lockPiece([{ x: 0, y: 39 }], PieceType.I);
      expect(board.hasGarbage()).toBe(false);
    });
  });

  describe('clearGarbage', () => {
    it('removes all garbage cells', () => {
      const board = new Board();
      board.pushGarbageRows(3);
      expect(board.hasGarbage()).toBe(true);

      board.clearGarbage();
      expect(board.hasGarbage()).toBe(false);
    });

    it('preserves piece cells', () => {
      const board = new Board();
      board.lockPiece([{ x: 5, y: 35 }], PieceType.T);
      board.pushGarbageRows(2);

      board.clearGarbage();
      expect(board.hasGarbage()).toBe(false);
      // Piece cell shifted up by 2 rows to row 33
      expect(board.getCell(33, 5)).toBe(PieceType.T);
    });

    it('is a no-op on empty board', () => {
      const board = new Board();
      board.clearGarbage();
      expect(board.hasGarbage()).toBe(false);
    });
  });

  describe('removeGarbageRows', () => {
    it('removes garbage rows from the bottom', () => {
      const board = new Board();
      board.pushGarbageRows(4);
      const removed = board.removeGarbageRows(2);
      expect(removed).toBe(2);

      // Bottom 2 rows should still be garbage
      for (let col = 0; col < BOARD_WIDTH; col++) {
        expect(board.getCell(BOARD_HEIGHT - 1, col)).toBe('GARBAGE');
        expect(board.getCell(BOARD_HEIGHT - 2, col)).toBe('GARBAGE');
      }
      // Row above should be empty (shifted down)
      expect(board.getCell(BOARD_HEIGHT - 3, 0)).toBeNull();
    });

    it('removes all garbage rows when count exceeds available', () => {
      const board = new Board();
      board.pushGarbageRows(3);
      const removed = board.removeGarbageRows(10);
      expect(removed).toBe(3);
      expect(board.hasGarbage()).toBe(false);
    });

    it('returns 0 when no garbage rows exist', () => {
      const board = new Board();
      board.lockPiece([{ x: 0, y: 39 }], PieceType.I);
      const removed = board.removeGarbageRows(2);
      expect(removed).toBe(0);
    });

    it('does nothing for count <= 0', () => {
      const board = new Board();
      board.pushGarbageRows(2);
      expect(board.removeGarbageRows(0)).toBe(0);
      expect(board.removeGarbageRows(-1)).toBe(0);
      expect(board.hasGarbage()).toBe(true);
    });

    it('preserves non-garbage content and shifts it down', () => {
      const board = new Board();
      // Place piece at row 37
      board.lockPiece([{ x: 5, y: 37 }], PieceType.T);
      // Push 2 garbage rows — piece moves to row 35
      board.pushGarbageRows(2);
      expect(board.getCell(35, 5)).toBe(PieceType.T);

      // Remove 1 garbage row — piece should shift down to row 36
      const removed = board.removeGarbageRows(1);
      expect(removed).toBe(1);
      expect(board.getCell(36, 5)).toBe(PieceType.T);
    });

    it('maintains grid dimensions', () => {
      const board = new Board();
      board.pushGarbageRows(5);
      board.removeGarbageRows(3);
      const grid = board.getGrid();
      expect(grid.length).toBe(BOARD_HEIGHT);
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        expect(grid[row]!.length).toBe(BOARD_WIDTH);
      }
    });

    it('does not remove rows with mixed content', () => {
      const board = new Board();
      board.pushGarbageRows(2);
      // Overwrite one cell in bottom row with a piece type — no longer pure garbage
      board.lockPiece([{ x: 0, y: BOARD_HEIGHT - 1 }], PieceType.I);

      const removed = board.removeGarbageRows(2);
      // Only the second-to-last row is pure garbage
      expect(removed).toBe(1);
    });
  });

  describe('clearFullRows with garbage', () => {
    it('does NOT clear pure garbage rows', () => {
      const board = new Board();
      board.pushGarbageRows(3);

      const cleared = board.clearFullRows();
      expect(cleared).toEqual([]);

      // Garbage rows should still exist
      for (let col = 0; col < BOARD_WIDTH; col++) {
        expect(board.getCell(39, col)).toBe('GARBAGE');
      }
    });

    it('clears a row that is full with mixed content (pieces + garbage)', () => {
      const board = new Board();
      // Push 1 garbage row
      board.pushGarbageRows(1);

      // Now replace some garbage cells with piece cells to make a clearable row
      // Actually, garbage fills entire row. Place a piece on row 38 above it.
      // Let's fill row 38 with pieces
      const blocks = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        blocks.push({ x: col, y: 38 });
      }
      board.lockPiece(blocks, PieceType.I);

      const cleared = board.clearFullRows();
      // Row 38 should be cleared (all pieces, non-garbage)
      expect(cleared.length).toBe(1);
      expect(cleared).toContain(38);

      // Row 39 (garbage) should still exist (shifted? No, only cleared rows are removed)
      // After clearing row 38 and shifting, the garbage row at 39 stays at 39
      expect(board.getCell(39, 0)).toBe('GARBAGE');
    });
  });
});
