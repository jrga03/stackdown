import { Cell, Grid, Position, PieceType } from './types';
import { BOARD_WIDTH, BOARD_HEIGHT } from './constants';

export class Board {
  private grid: Grid;

  constructor() {
    this.grid = Board.createEmptyGrid();
  }

  private static createEmptyGrid(): Grid {
    const grid: Grid = [];
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      grid.push(Board.createEmptyRow());
    }
    return grid;
  }

  private static createEmptyRow(): Cell[] {
    const row: Cell[] = [];
    for (let col = 0; col < BOARD_WIDTH; col++) {
      row.push(null);
    }
    return row;
  }

  /** Returns the cell value at the given row and column. */
  getCell(row: number, col: number): Cell {
    return this.grid[row]![col]!;
  }

  /** Resets the board to a completely empty grid. */
  reset(): void {
    this.grid = Board.createEmptyGrid();
  }

  /** Returns the full 40x10 grid. */
  getGrid(): Grid {
    return this.grid;
  }

  /**
   * Checks if all block positions are within bounds and on empty cells.
   * A position is valid if:
   * - 0 <= x < BOARD_WIDTH
   * - 0 <= y < BOARD_HEIGHT
   * - grid[y][x] === null
   */
  isValidPosition(blocks: readonly Position[]): boolean {
    for (const block of blocks) {
      const { x, y } = block;
      if (x < 0 || x >= BOARD_WIDTH) return false;
      if (y < 0 || y >= BOARD_HEIGHT) return false;
      if (this.grid[y]![x] !== null) return false;
    }
    return true;
  }

  /** Writes the piece type into the grid at the given block positions. */
  lockPiece(blocks: readonly Position[], type: PieceType): void {
    for (const block of blocks) {
      this.grid[block.y]![block.x] = type;
    }
  }

  /**
   * Removes full rows, shifts above down, inserts empty rows at top.
   * Returns the original row indices of cleared rows.
   *
   * Algorithm:
   * 1. Iterate rows bottom to top
   * 2. Row is full when every cell is non-null
   * 3. Remove full rows from grid
   * 4. Insert empty rows at top to maintain height
   * 5. Return array of cleared row indices (original positions before removal)
   */
  clearFullRows(): number[] {
    const clearedIndices: number[] = [];

    // Find clearable rows (bottom to top for correct ordering)
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (this.isRowClearable(row)) {
        clearedIndices.push(row);
      }
    }

    if (clearedIndices.length === 0) return [];

    // clearedIndices is in descending order (bottom to top), which is correct
    // for splicing without index shifting issues
    for (const rowIndex of clearedIndices) {
      this.grid.splice(rowIndex, 1);
    }

    // Insert empty rows at the top to maintain grid height
    for (let i = 0; i < clearedIndices.length; i++) {
      this.grid.unshift(Board.createEmptyRow());
    }

    // Return sorted ascending for consistent output
    return clearedIndices.sort((a, b) => a - b);
  }

  /**
   * Pushes n garbage rows onto the bottom of the board.
   * Existing rows shift up by n. Top n rows are discarded.
   * Garbage rows are solid (no gap) — intentional for versus mode.
   */
  pushGarbageRows(count: number): void {
    if (count <= 0) return;
    // Cap to grid height to prevent corruption if count exceeds board size
    const capped = Math.min(count, BOARD_HEIGHT);

    // Remove top rows (they get pushed off)
    this.grid.splice(0, capped);

    // Add garbage rows at the bottom
    for (let i = 0; i < capped; i++) {
      const row: Cell[] = [];
      for (let col = 0; col < BOARD_WIDTH; col++) {
        row.push('GARBAGE');
      }
      this.grid.push(row);
    }
  }

  /**
   * Remove up to `count` garbage rows from the bottom of the board.
   * Shifts remaining content down and inserts empty rows at top.
   * A garbage row = every cell is 'GARBAGE'.
   * Returns the number of rows actually removed.
   */
  removeGarbageRows(count: number): number {
    if (count <= 0) return 0;

    // Find garbage rows from bottom up
    const garbageIndices: number[] = [];
    for (let row = BOARD_HEIGHT - 1; row >= 0 && garbageIndices.length < count; row--) {
      if (this.isGarbageRow(row)) {
        garbageIndices.push(row);
      }
    }

    if (garbageIndices.length === 0) return 0;

    // Remove in descending order (safe for splice)
    for (const rowIndex of garbageIndices) {
      this.grid.splice(rowIndex, 1);
    }

    // Insert empty rows at top
    for (let i = 0; i < garbageIndices.length; i++) {
      this.grid.unshift(Board.createEmptyRow());
    }

    return garbageIndices.length;
  }

  /** Returns true if every cell in the row is 'GARBAGE'. */
  private isGarbageRow(row: number): boolean {
    const gridRow = this.grid[row]!;
    for (let col = 0; col < BOARD_WIDTH; col++) {
      if (gridRow[col] !== 'GARBAGE') return false;
    }
    return true;
  }

  /** Returns true if the grid contains any GARBAGE cell. */
  hasGarbage(): boolean {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        if (this.grid[row]![col] === 'GARBAGE') return true;
      }
    }
    return false;
  }

  /** Replaces all GARBAGE cells with null. */
  clearGarbage(): void {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        if (this.grid[row]![col] === 'GARBAGE') {
          this.grid[row]![col] = null;
        }
      }
    }
  }

  /**
   * A row is clearable only if it is full AND contains at least one
   * non-GARBAGE cell. Pure garbage rows are never auto-cleared.
   */
  private isRowClearable(row: number): boolean {
    const gridRow = this.grid[row]!;
    let hasNonGarbage = false;
    for (let col = 0; col < BOARD_WIDTH; col++) {
      if (gridRow[col] === null) return false;
      if (gridRow[col] !== 'GARBAGE') hasNonGarbage = true;
    }
    return hasNonGarbage;
  }
}
