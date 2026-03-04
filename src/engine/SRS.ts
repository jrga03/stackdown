import { PieceType, RotationState, type ActivePieceState, type Position } from './types';
import { getBlocks } from './Piece';
import { Board } from './Board';

// ── Offset Tables ──

const JLSTZ_OFFSETS: Position[][] = [
  [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],   // State 0
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],   // State R
  [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],   // State 2
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }], // State L
];

const I_OFFSETS: Position[][] = [
  [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }],   // State 0
  [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -2 }],   // State R
  [{ x: -1, y: 1 }, { x: 1, y: 1 }, { x: -2, y: 1 }, { x: 1, y: 0 }, { x: -2, y: 0 }],  // State 2
  [{ x: 0, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 0, y: 2 }],    // State L
];

const O_OFFSETS: Position[][] = [
  [{ x: 0, y: 0 }],    // State 0
  [{ x: 0, y: -1 }],   // State R
  [{ x: -1, y: -1 }],  // State 2
  [{ x: -1, y: 0 }],   // State L
];

function getOffsetTable(type: PieceType): Position[][] {
  if (type === PieceType.I) return I_OFFSETS;
  if (type === PieceType.O) return O_OFFSETS;
  return JLSTZ_OFFSETS;
}

function getTargetRotation(current: RotationState, direction: 'cw' | 'ccw' | '180'): RotationState {
  if (direction === 'cw') return ((current + 1) % 4) as RotationState;
  if (direction === 'ccw') return ((current + 3) % 4) as RotationState;
  return ((current + 2) % 4) as RotationState;
}

export interface RotationResult {
  position: Position;
  rotation: RotationState;
  kickIndex: number;
}

export function tryRotation(
  board: Board,
  piece: ActivePieceState,
  direction: 'cw' | 'ccw' | '180',
): RotationResult | null {
  const targetRotation = getTargetRotation(piece.rotation, direction);
  const offsets = getOffsetTable(piece.type);
  const fromOffsets = offsets[piece.rotation]!;
  const toOffsets = offsets[targetRotation]!;
  const testCount = Math.min(fromOffsets.length, toOffsets.length);

  for (let i = 0; i < testCount; i++) {
    const kickX = fromOffsets[i]!.x - toOffsets[i]!.x;
    const kickY = fromOffsets[i]!.y - toOffsets[i]!.y;

    const testPosition: Position = {
      x: piece.position.x + kickX,
      y: piece.position.y - kickY, // y-axis inverted: positive = down in grid
    };

    const blocks = getBlocks(piece.type, targetRotation);
    const absoluteBlocks = blocks.map((b) => ({
      x: b.x + testPosition.x,
      y: b.y + testPosition.y,
    }));

    if (board.isValidPosition(absoluteBlocks)) {
      return {
        position: testPosition,
        rotation: targetRotation,
        kickIndex: i,
      };
    }
  }

  return null;
}
