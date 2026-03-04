import { SCORE_TABLE, LINES_PER_LEVEL } from './constants';

export interface ScoreManagerOptions {
  startLevel?: number;
  fixedLevel?: boolean;
}

export class ScoreManager {
  private score: number = 0;
  private level: number;
  private linesCleared: number = 0;
  private combo: number = -1;
  private backToBack: boolean = false;
  private readonly fixedLevel: boolean;
  private linesToNextLevel: number;

  constructor(options?: ScoreManagerOptions) {
    this.level = options?.startLevel ?? 1;
    this.fixedLevel = options?.fixedLevel ?? false;
    this.linesToNextLevel = this.getLinesToNextLevel();
  }

  /**
   * Process a line clear and return total points awarded.
   * Total = (basePoints x level [x 1.5 if B2B]) + comboBonus
   */
  processLineClear(
    count: number,
    isTSpin: boolean,
    isTSpinMini: boolean,
    combo: number,
  ): number {
    const basePoints = this.getBasePoints(count, isTSpin, isTSpinMini);
    const isDifficult = this.isDifficultClear(count, isTSpin, isTSpinMini);

    let points = basePoints * this.level;

    // Apply B2B multiplier if the previous clear was also difficult
    if (this.backToBack && isDifficult) {
      points = Math.floor(points * SCORE_TABLE.backToBackMultiplier);
    }

    // Update B2B state: difficult clears set it, non-difficult clears reset it
    if (isDifficult) {
      this.backToBack = true;
    } else {
      this.backToBack = false;
    }

    // Combo bonus
    const comboBonus =
      combo > 0 ? SCORE_TABLE.comboMultiplier * combo * this.level : 0;
    const totalPoints = points + comboBonus;

    this.score += totalPoints;
    this.linesCleared += count;

    return totalPoints;
  }

  /**
   * Process a T-Spin with no line clears.
   * Returns points awarded (basePoints x level).
   */
  processTSpinNoLines(mini: boolean): number {
    const basePoints = mini ? SCORE_TABLE.tSpinMini : SCORE_TABLE.tSpin;
    const points = basePoints * this.level;
    this.score += points;
    return points;
  }

  /**
   * Add drop points (soft or hard). Not multiplied by level.
   */
  addDropPoints(cells: number, isHardDrop: boolean): void {
    const pointsPerCell = isHardDrop
      ? SCORE_TABLE.hardDrop
      : SCORE_TABLE.softDrop;
    this.score += pointsPerCell * cells;
  }

  /**
   * Check if enough lines have been cleared to advance to the next level.
   * Returns the new level, or null if no level-up occurred.
   * Always returns null when fixedLevel is true.
   */
  checkLevelUp(): number | null {
    if (this.fixedLevel) {
      return null;
    }

    if (this.level >= LINES_PER_LEVEL.length - 1) {
      return null; // max level reached
    }

    if (this.linesCleared >= this.linesToNextLevel) {
      this.linesCleared -= this.linesToNextLevel;
      this.level += 1;
      this.linesToNextLevel = this.getLinesToNextLevel();
      return this.level;
    }

    return null;
  }

  getScore(): number {
    return this.score;
  }

  getLevel(): number {
    return this.level;
  }

  getLinesCleared(): number {
    return this.linesCleared;
  }

  getCombo(): number {
    return this.combo;
  }

  getBackToBack(): boolean {
    return this.backToBack;
  }

  /**
   * Called when a piece locks without clearing any lines.
   * Resets combo to -1. Does NOT reset back-to-back.
   */
  resetCombo(): void {
    this.combo = -1;
  }

  // ── Private helpers ──

  private getBasePoints(
    count: number,
    isTSpin: boolean,
    isTSpinMini: boolean,
  ): number {
    if (isTSpin && isTSpinMini) {
      // T-Spin Mini
      switch (count) {
        case 1:
          return SCORE_TABLE.tSpinMiniSingle;
        case 2:
          return SCORE_TABLE.tSpinMiniDouble;
        default:
          return SCORE_TABLE.tSpinMini;
      }
    }

    if (isTSpin) {
      // Full T-Spin
      switch (count) {
        case 1:
          return SCORE_TABLE.tSpinSingle;
        case 2:
          return SCORE_TABLE.tSpinDouble;
        case 3:
          return SCORE_TABLE.tSpinTriple;
        default:
          return SCORE_TABLE.tSpin;
      }
    }

    // Normal clear
    switch (count) {
      case 1:
        return SCORE_TABLE.single;
      case 2:
        return SCORE_TABLE.double;
      case 3:
        return SCORE_TABLE.triple;
      case 4:
        return SCORE_TABLE.quad;
      default:
        return 0;
    }
  }

  /**
   * A clear is "difficult" if it's a Quad or a full T-Spin clear (not mini).
   */
  private isDifficultClear(
    count: number,
    isTSpin: boolean,
    isTSpinMini: boolean,
  ): boolean {
    if (count === 4) return true;
    if (isTSpin && !isTSpinMini && count > 0) return true;
    return false;
  }

  private getLinesToNextLevel(): number {
    if (this.level < LINES_PER_LEVEL.length) {
      return LINES_PER_LEVEL[this.level] ?? 15;
    }
    return LINES_PER_LEVEL[LINES_PER_LEVEL.length - 1] ?? 15;
  }
}
