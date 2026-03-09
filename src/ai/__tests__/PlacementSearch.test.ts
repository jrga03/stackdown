import { describe, it, expect } from 'vitest';
import { findAllPlacements, findBestWithLookahead } from '../worker/PlacementSearch';
import type { HeuristicWeights } from '../types';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 40;

function emptyGrid(): (string | null)[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    new Array(BOARD_WIDTH).fill(null) as (string | null)[],
  );
}

const weights: HeuristicWeights = {
  height: 1.0,
  holes: 1.0,
  lines: 1.0,
  bumpiness: 0.5,
  well: 0.3,
  tspin: 0.1,
};

describe('PlacementSearch', () => {
  describe('findAllPlacements', () => {
    it('finds placements for I piece on empty board', () => {
      const grid = emptyGrid();
      const placements = findAllPlacements(grid, 'I', weights);

      // I piece has 2 unique rotations (0 and 1, 2 and 3 are mirrors)
      // But we enumerate all 4, each with multiple columns
      expect(placements.length).toBeGreaterThan(0);

      // Each placement should have col, rotation, score
      for (const p of placements) {
        expect(typeof p.col).toBe('number');
        expect(typeof p.rotation).toBe('number');
        expect(typeof p.score).toBe('number');
      }
    });

    it('finds placements for O piece (only 1 rotation)', () => {
      const grid = emptyGrid();
      const placements = findAllPlacements(grid, 'O', weights);

      // O piece: 1 rotation, 9 columns (0..8)
      expect(placements.length).toBe(9);

      // All rotations should be 0
      for (const p of placements) {
        expect(p.rotation).toBe(0);
      }
    });

    it('returns no placements if board is completely full', () => {
      const grid = emptyGrid();
      // Fill the entire board
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          grid[row]![col] = 'I';
        }
      }

      const placements = findAllPlacements(grid, 'T', weights);
      expect(placements.length).toBe(0);
    });
  });

  describe('findBestWithLookahead', () => {
    it('returns a placement without lookahead', () => {
      const grid = emptyGrid();
      const best = findBestWithLookahead(grid, 'T', 'I', weights, false);

      expect(best).not.toBeNull();
      expect(typeof best!.col).toBe('number');
      expect(typeof best!.rotation).toBe('number');
    });

    it('returns a placement with lookahead', () => {
      const grid = emptyGrid();
      const best = findBestWithLookahead(grid, 'T', 'I', weights, true);

      expect(best).not.toBeNull();
      expect(typeof best!.col).toBe('number');
    });

    it('prefers flat placements on empty board', () => {
      const grid = emptyGrid();
      const best = findBestWithLookahead(grid, 'I', 'T', weights, false);

      // Horizontal I piece (rotation 0) should be preferred — it's flat
      expect(best).not.toBeNull();
      expect(best!.rotation).toBe(0);
    });
  });
});
