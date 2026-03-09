import { describe, it, expect } from 'vitest';
import { evaluateBoard } from '../worker/BoardEvaluator';
import type { HeuristicWeights } from '../types';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 40;

function emptyGrid(): (string | null)[][] {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    new Array(BOARD_WIDTH).fill(null) as (string | null)[],
  );
}

const defaultWeights: HeuristicWeights = {
  height: 1.0,
  holes: 1.0,
  lines: 1.0,
  bumpiness: 0.5,
  well: 0.3,
  tspin: 0.1,
};

describe('BoardEvaluator', () => {
  it('returns 0 for an empty board with zero weights', () => {
    const grid = emptyGrid();
    const zeroWeights: HeuristicWeights = {
      height: 0, holes: 0, lines: 0, bumpiness: 0, well: 0, tspin: 0,
    };
    expect(evaluateBoard(grid, zeroWeights)).toBe(0);
  });

  it('empty board scores higher than board with tall columns', () => {
    const empty = emptyGrid();
    const tall = emptyGrid();

    // Fill column 0 up to row 30 (10 cells high)
    for (let row = 30; row < BOARD_HEIGHT; row++) {
      tall[row]![0] = 'I';
    }

    const emptyScore = evaluateBoard(empty, defaultWeights);
    const tallScore = evaluateBoard(tall, defaultWeights);
    expect(emptyScore).toBeGreaterThan(tallScore);
  });

  it('board with complete lines scores higher than without', () => {
    const noLines = emptyGrid();
    const withLines = emptyGrid();

    // Fill row 39 completely
    for (let col = 0; col < BOARD_WIDTH; col++) {
      noLines[39]![col] = 'I';
      withLines[39]![col] = 'I';
    }
    // Leave a gap in noLines
    noLines[39]![5] = null;

    const noLinesScore = evaluateBoard(noLines, defaultWeights);
    const withLinesScore = evaluateBoard(withLines, defaultWeights);
    expect(withLinesScore).toBeGreaterThan(noLinesScore);
  });

  it('penalizes holes', () => {
    const noHoles = emptyGrid();
    const withHoles = emptyGrid();

    // Both have a piece at row 38
    noHoles[38]![0] = 'I';
    withHoles[38]![0] = 'I';

    // withHoles has an empty cell below the piece at row 39
    noHoles[39]![0] = 'I';
    // withHoles[39][0] is null — creating a hole

    const noHolesScore = evaluateBoard(noHoles, defaultWeights);
    const withHolesScore = evaluateBoard(withHoles, defaultWeights);
    expect(noHolesScore).toBeGreaterThan(withHolesScore);
  });
});
