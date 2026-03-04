import { describe, it, expect } from 'vitest';
import { Randomizer } from '../Randomizer';
import { PieceType } from '../types';

const ALL_PIECE_TYPES = [
  PieceType.I,
  PieceType.O,
  PieceType.T,
  PieceType.S,
  PieceType.Z,
  PieceType.J,
  PieceType.L,
];

describe('Randomizer', () => {
  it('queue is pre-filled with at least 14 pieces', () => {
    const rand = new Randomizer(42);
    // peek(14) should return 14 pieces without error
    const peeked = rand.peek(14);
    expect(peeked).toHaveLength(14);
  });

  it('each bag contains exactly one of each piece type (first 7 from seeded)', () => {
    const rand = new Randomizer(42);
    const firstBag: PieceType[] = [];
    for (let i = 0; i < 7; i++) {
      firstBag.push(rand.next());
    }
    expect(firstBag.sort()).toEqual([...ALL_PIECE_TYPES].sort());
  });

  it('next() returns a PieceType', () => {
    const rand = new Randomizer(42);
    const piece = rand.next();
    expect(ALL_PIECE_TYPES).toContain(piece);
  });

  it('next() auto-generates a new bag when current exhausted (pull 14+ pieces)', () => {
    const rand = new Randomizer(42);
    const pieces: PieceType[] = [];
    // Pull 21 pieces (3 full bags worth)
    for (let i = 0; i < 21; i++) {
      const piece = rand.next();
      expect(ALL_PIECE_TYPES).toContain(piece);
      pieces.push(piece);
    }
    expect(pieces).toHaveLength(21);

    // Each group of 7 should contain all 7 types
    for (let bagStart = 0; bagStart < 21; bagStart += 7) {
      const bag = pieces.slice(bagStart, bagStart + 7);
      expect(bag.sort()).toEqual([...ALL_PIECE_TYPES].sort());
    }
  });

  it('peek(n) returns next N pieces without consuming them', () => {
    const rand = new Randomizer(42);
    const peeked = rand.peek(5);
    expect(peeked).toHaveLength(5);

    // Peeking again should return the same pieces
    const peekedAgain = rand.peek(5);
    expect(peekedAgain).toEqual(peeked);
  });

  it('after peek(5), next() returns same piece that was first in peek', () => {
    const rand = new Randomizer(42);
    const peeked = rand.peek(5);
    const firstPeeked = peeked[0];
    const nextPiece = rand.next();
    expect(nextPiece).toBe(firstPeeked);
  });

  it('seeded randomizer produces same sequence with same seed', () => {
    const rand1 = new Randomizer(12345);
    const rand2 = new Randomizer(12345);

    const seq1: PieceType[] = [];
    const seq2: PieceType[] = [];
    for (let i = 0; i < 28; i++) {
      seq1.push(rand1.next());
      seq2.push(rand2.next());
    }
    expect(seq1).toEqual(seq2);
  });

  it('different seeds produce different sequences', () => {
    const rand1 = new Randomizer(111);
    const rand2 = new Randomizer(999);

    const seq1: PieceType[] = [];
    const seq2: PieceType[] = [];
    for (let i = 0; i < 14; i++) {
      seq1.push(rand1.next());
      seq2.push(rand2.next());
    }
    // It's theoretically possible but astronomically unlikely that two
    // different seeds produce the same 14-piece sequence
    expect(seq1).not.toEqual(seq2);
  });

  it('every 7-piece window in first 14 pieces contains all 7 types (bag property)', () => {
    const rand = new Randomizer(42);
    const pieces: PieceType[] = [];
    for (let i = 0; i < 14; i++) {
      pieces.push(rand.next());
    }

    // First bag: pieces 0-6
    const bag1 = pieces.slice(0, 7);
    expect(bag1.sort()).toEqual([...ALL_PIECE_TYPES].sort());

    // Second bag: pieces 7-13
    const bag2 = pieces.slice(7, 14);
    expect(bag2.sort()).toEqual([...ALL_PIECE_TYPES].sort());
  });

  it('unseeded randomizer produces varied sequences (probabilistic)', () => {
    // Create multiple unseeded randomizers and check they don't all produce
    // the same first piece (extremely unlikely if random)
    const firstPieces = new Set<PieceType>();
    for (let i = 0; i < 20; i++) {
      const rand = new Randomizer();
      firstPieces.add(rand.next());
    }
    // With 20 trials, we should see at least 2 different first pieces
    expect(firstPieces.size).toBeGreaterThan(1);
  });
});
