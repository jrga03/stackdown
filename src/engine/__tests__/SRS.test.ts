import { describe, test, expect } from 'vitest';
import { tryRotation } from '../SRS';
import { Board } from '../Board';
import { PieceType, RotationState, type ActivePieceState } from '../types';

function makePiece(
  type: PieceType,
  x: number,
  y: number,
  rotation: RotationState = RotationState.SPAWN,
): ActivePieceState {
  return {
    type,
    position: { x, y },
    rotation,
    lockDelayRemaining: 500,
    moveResetCount: 0,
    lastActionWasRotation: false,
    lastKickIndex: 0,
  };
}

describe('SRS rotation', () => {
  describe('basic rotation (no wall kicks needed)', () => {
    test('CW: SPAWN -> RIGHT', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.RIGHT);
      expect(result!.kickIndex).toBe(0);
    });

    test('CW: RIGHT -> FLIP', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20, RotationState.RIGHT);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.FLIP);
    });

    test('CW: FLIP -> LEFT', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20, RotationState.FLIP);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.LEFT);
    });

    test('CW: LEFT -> SPAWN', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20, RotationState.LEFT);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.SPAWN);
    });

    test('CCW: SPAWN -> LEFT', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20);
      const result = tryRotation(board, piece, 'ccw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.LEFT);
    });

    test('CCW: LEFT -> FLIP', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20, RotationState.LEFT);
      const result = tryRotation(board, piece, 'ccw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.FLIP);
    });

    test('CCW: FLIP -> RIGHT', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20, RotationState.FLIP);
      const result = tryRotation(board, piece, 'ccw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.RIGHT);
    });

    test('CCW: RIGHT -> SPAWN', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20, RotationState.RIGHT);
      const result = tryRotation(board, piece, 'ccw');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.SPAWN);
    });

    test('180: SPAWN -> FLIP', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20);
      const result = tryRotation(board, piece, '180');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.FLIP);
    });

    test('180: RIGHT -> LEFT', () => {
      const board = new Board();
      const piece = makePiece(PieceType.T, 4, 20, RotationState.RIGHT);
      const result = tryRotation(board, piece, '180');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBe(RotationState.LEFT);
    });
  });

  describe('wall kicks', () => {
    test('T piece kicks off right wall (SPAWN -> RIGHT)', () => {
      const board = new Board();
      // Place T at right edge: bounding box x=8, blocks at col 8,9,10 — col 10 out of bounds
      // After CW to RIGHT, blocks would be at {x:9,y:0},{x:9,y:1},{x:10,y:1},{x:9,y:2} relative to spawn
      // Needs wall kick to shift left
      const piece = makePiece(PieceType.T, 8, 20);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
      expect(result!.kickIndex).toBeGreaterThan(0);
    });

    test('T piece kicks off left wall (SPAWN -> LEFT)', () => {
      const board = new Board();
      // Place T at left edge: bounding box x=-1
      const piece = makePiece(PieceType.T, -1, 20);
      // CCW to LEFT: blocks at {x:0,y:0},{x:-1,y:1},{x:0,y:1},{x:0,y:2} — x=-1 out of bounds
      const result = tryRotation(board, piece, 'ccw');
      expect(result).not.toBeNull();
      expect(result!.kickIndex).toBeGreaterThan(0);
    });

    test('I piece kicks off right wall', () => {
      const board = new Board();
      // I piece at right edge, SPAWN -> RIGHT (vertical)
      const piece = makePiece(PieceType.I, 8, 20);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
    });

    test('I piece floor kick', () => {
      const board = new Board();
      // I piece in RIGHT (vertical), near bottom
      // RIGHT state blocks: {x:2,y:0},{x:2,y:1},{x:2,y:2},{x:2,y:3} relative to bbox
      // Place at row 38 so block at y=41 after rotation to FLIP would be out of bounds
      const piece = makePiece(PieceType.I, 4, 38, RotationState.RIGHT);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
    });
  });

  describe('blocked rotation', () => {
    test('returns null when all kick tests fail', () => {
      const board = new Board();
      // Fill the board densely around the piece to block all rotations
      for (let row = 19; row < 23; row++) {
        for (let col = 0; col < 10; col++) {
          if (!(row === 20 && col >= 4 && col <= 6) && // leave T spawn space
              !(row === 19 && col === 5)) { // leave T top block space
            board.lockPiece([{ x: col, y: row }], PieceType.I);
          }
        }
      }
      const piece = makePiece(PieceType.T, 4, 19);
      const result = tryRotation(board, piece, 'cw');
      expect(result).toBeNull();
    });
  });

  describe('O piece rotation', () => {
    test('O piece rotation returns kickIndex 0', () => {
      const board = new Board();
      const piece = makePiece(PieceType.O, 4, 20);
      const result = tryRotation(board, piece, 'cw');
      expect(result).not.toBeNull();
      expect(result!.kickIndex).toBe(0);
    });
  });

  describe('all JLSTZ pieces rotate', () => {
    for (const type of [PieceType.J, PieceType.L, PieceType.S, PieceType.T, PieceType.Z]) {
      test(`${type} piece CW rotation works`, () => {
        const board = new Board();
        const piece = makePiece(type, 4, 20);
        const result = tryRotation(board, piece, 'cw');
        expect(result).not.toBeNull();
        expect(result!.rotation).toBe(RotationState.RIGHT);
      });
    }
  });
});
