import { describe, it, expect } from 'vitest';
import { getBlocks } from '../Piece';
import { PieceType, RotationState, Position } from '../types';

// Helper to sort positions for comparison (order-independent)
function sortPositions(positions: Position[]): Position[] {
  return [...positions].sort((a, b) => a.y - b.y || a.x - b.x);
}

describe('Piece shapes', () => {
  // ── Test 1: Every piece type has 4 rotation states, each with 4 blocks ──

  describe('every piece type has 4 rotation states with 4 blocks each', () => {
    const allTypes = [
      PieceType.I,
      PieceType.O,
      PieceType.T,
      PieceType.S,
      PieceType.Z,
      PieceType.J,
      PieceType.L,
    ];
    const allRotations = [
      RotationState.SPAWN,
      RotationState.RIGHT,
      RotationState.FLIP,
      RotationState.LEFT,
    ];

    for (const type of allTypes) {
      for (const rotation of allRotations) {
        it(`${type} rotation ${rotation} returns exactly 4 blocks`, () => {
          const blocks = getBlocks(type, rotation);
          expect(blocks).toHaveLength(4);
        });
      }
    }
  });

  // ── Test 2: getBlocks returns correct coordinates (spot checks) ──

  describe('getBlocks returns correct coordinates', () => {
    it('I piece SPAWN state', () => {
      const blocks = getBlocks(PieceType.I, RotationState.SPAWN);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ]),
      );
    });

    it('I piece RIGHT state', () => {
      const blocks = getBlocks(PieceType.I, RotationState.RIGHT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
          { x: 2, y: 3 },
        ]),
      );
    });

    it('I piece FLIP state', () => {
      const blocks = getBlocks(PieceType.I, RotationState.FLIP);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 0, y: 2 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
        ]),
      );
    });

    it('I piece LEFT state', () => {
      const blocks = getBlocks(PieceType.I, RotationState.LEFT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
        ]),
      );
    });

    it('T piece SPAWN state', () => {
      const blocks = getBlocks(PieceType.T, RotationState.SPAWN);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ]),
      );
    });

    it('T piece RIGHT state', () => {
      const blocks = getBlocks(PieceType.T, RotationState.RIGHT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
        ]),
      );
    });

    it('T piece FLIP state', () => {
      const blocks = getBlocks(PieceType.T, RotationState.FLIP);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
        ]),
      );
    });

    it('T piece LEFT state', () => {
      const blocks = getBlocks(PieceType.T, RotationState.LEFT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
        ]),
      );
    });

    it('S piece SPAWN state', () => {
      const blocks = getBlocks(PieceType.S, RotationState.SPAWN);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
        ]),
      );
    });

    it('Z piece SPAWN state', () => {
      const blocks = getBlocks(PieceType.Z, RotationState.SPAWN);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ]),
      );
    });

    it('J piece SPAWN state', () => {
      const blocks = getBlocks(PieceType.J, RotationState.SPAWN);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ]),
      );
    });

    it('L piece SPAWN state', () => {
      const blocks = getBlocks(PieceType.L, RotationState.SPAWN);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 2, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ]),
      );
    });

    it('L piece RIGHT state', () => {
      const blocks = getBlocks(PieceType.L, RotationState.RIGHT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ]),
      );
    });

    it('S piece LEFT state', () => {
      const blocks = getBlocks(PieceType.S, RotationState.LEFT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
        ]),
      );
    });

    it('Z piece RIGHT state', () => {
      const blocks = getBlocks(PieceType.Z, RotationState.RIGHT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 2, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
        ]),
      );
    });

    it('J piece LEFT state', () => {
      const blocks = getBlocks(PieceType.J, RotationState.LEFT);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 2 },
          { x: 1, y: 2 },
        ]),
      );
    });
  });

  // ── Test 3: O piece is identical in all 4 rotation states ──

  describe('O piece is identical in all 4 rotation states', () => {
    it('all rotations produce the same blocks', () => {
      const spawn = sortPositions(getBlocks(PieceType.O, RotationState.SPAWN));
      const right = sortPositions(getBlocks(PieceType.O, RotationState.RIGHT));
      const flip = sortPositions(getBlocks(PieceType.O, RotationState.FLIP));
      const left = sortPositions(getBlocks(PieceType.O, RotationState.LEFT));

      expect(right).toEqual(spawn);
      expect(flip).toEqual(spawn);
      expect(left).toEqual(spawn);
    });

    it('O piece blocks are correct', () => {
      const blocks = getBlocks(PieceType.O, RotationState.SPAWN);
      expect(sortPositions(blocks)).toEqual(
        sortPositions([
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
        ]),
      );
    });
  });

  // ── Test 4: I piece blocks are within 4x4 bounding box ──

  describe('I piece blocks are within 4x4 bounding box', () => {
    const allRotations = [
      RotationState.SPAWN,
      RotationState.RIGHT,
      RotationState.FLIP,
      RotationState.LEFT,
    ];

    for (const rotation of allRotations) {
      it(`rotation ${rotation} blocks within 0..3`, () => {
        const blocks = getBlocks(PieceType.I, rotation);
        for (const block of blocks) {
          expect(block.x).toBeGreaterThanOrEqual(0);
          expect(block.x).toBeLessThanOrEqual(3);
          expect(block.y).toBeGreaterThanOrEqual(0);
          expect(block.y).toBeLessThanOrEqual(3);
        }
      });
    }
  });

  // ── Test 5: T/S/Z/J/L blocks are within 3x3 bounding box ──

  describe('T/S/Z/J/L blocks are within 3x3 bounding box', () => {
    const types3x3 = [
      PieceType.T,
      PieceType.S,
      PieceType.Z,
      PieceType.J,
      PieceType.L,
    ];
    const allRotations = [
      RotationState.SPAWN,
      RotationState.RIGHT,
      RotationState.FLIP,
      RotationState.LEFT,
    ];

    for (const type of types3x3) {
      for (const rotation of allRotations) {
        it(`${type} rotation ${rotation} blocks within 0..2`, () => {
          const blocks = getBlocks(type, rotation);
          for (const block of blocks) {
            expect(block.x).toBeGreaterThanOrEqual(0);
            expect(block.x).toBeLessThanOrEqual(2);
            expect(block.y).toBeGreaterThanOrEqual(0);
            expect(block.y).toBeLessThanOrEqual(2);
          }
        });
      }
    }
  });

  // ── Test: getBlocks returns a new array each time (immutability) ──

  describe('immutability', () => {
    it('returns a new array on each call', () => {
      const a = getBlocks(PieceType.T, RotationState.SPAWN);
      const b = getBlocks(PieceType.T, RotationState.SPAWN);
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });
});
