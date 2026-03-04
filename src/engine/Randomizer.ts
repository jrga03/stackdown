import { PieceType } from './types';

const ALL_PIECE_TYPES: PieceType[] = [
  PieceType.I,
  PieceType.O,
  PieceType.T,
  PieceType.S,
  PieceType.Z,
  PieceType.J,
  PieceType.L,
];

/**
 * Mulberry32 seeded PRNG. Returns a function that produces
 * deterministic pseudo-random numbers in [0, 1).
 */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Randomizer {
  private queue: PieceType[];
  private rng: () => number;

  constructor(seed?: number) {
    if (seed !== undefined) {
      this.rng = mulberry32(seed);
    } else {
      // Use Math.random for unseeded instances
      this.rng = () => Math.random();
    }

    // Pre-fill with 2 bags (14 pieces)
    this.queue = [];
    this.queue.push(...this.generateBag());
    this.queue.push(...this.generateBag());
  }

  /**
   * Dequeue the next piece from the queue.
   * If the queue drops below 7 pieces, generate and append a new bag.
   */
  next(): PieceType {
    const piece = this.queue.shift()!;

    if (this.queue.length < 7) {
      this.queue.push(...this.generateBag());
    }

    return piece;
  }

  /**
   * Return the next `count` pieces without consuming them.
   */
  peek(count: number): PieceType[] {
    // Ensure the queue has enough pieces for the peek
    while (this.queue.length < count) {
      this.queue.push(...this.generateBag());
    }
    return this.queue.slice(0, count);
  }

  /**
   * Generate a new bag of all 7 piece types, Fisher-Yates shuffled.
   */
  private generateBag(): PieceType[] {
    const bag = [...ALL_PIECE_TYPES];
    return this.shuffle(bag);
  }

  /**
   * Fisher-Yates (Knuth) shuffle, in-place, using the seeded PRNG.
   */
  private shuffle(arr: PieceType[]): PieceType[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const temp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = temp;
    }
    return arr;
  }
}
