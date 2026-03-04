import { ActivePieceState, PieceType, RotationState } from './types';
import { Board } from './Board';
import { BOARD_WIDTH, BOARD_HEIGHT } from './constants';

export type TSpinResult = 'none' | 'mini' | 'proper';

/**
 * Detects whether the given T piece placement qualifies as a T-Spin
 * using the 3-corner rule.
 *
 * Algorithm:
 * 1. Only T pieces can T-Spin.
 * 2. Last action must have been a rotation.
 * 3. Check 4 diagonal corners around the T piece center.
 * 4. A corner is occupied if out of bounds (wall/floor) or grid cell non-null.
 *    Above the board (y < 0) is NOT occupied.
 * 5. If fewer than 3 corners are occupied: 'none'.
 * 6. If lastKickIndex === 4: always 'proper'.
 * 7. Otherwise, check front corners by rotation state:
 *    - Both front corners occupied: 'proper'
 *    - One front corner occupied: 'mini'
 */
export function detectTSpin(board: Board, piece: ActivePieceState): TSpinResult {
  // Step 1: Only T pieces
  if (piece.type !== PieceType.T) {
    return 'none';
  }

  // Step 2: Must have rotated
  if (!piece.lastActionWasRotation) {
    return 'none';
  }

  // Step 3: Find T center (offset 1,1 in the 3x3 bounding box)
  const centerX = piece.position.x + 1;
  const centerY = piece.position.y + 1;

  // Step 4: Check 4 diagonal corners
  const cornerA = isCornerOccupied(board, centerX - 1, centerY - 1); // top-left
  const cornerB = isCornerOccupied(board, centerX + 1, centerY - 1); // top-right
  const cornerC = isCornerOccupied(board, centerX - 1, centerY + 1); // bottom-left
  const cornerD = isCornerOccupied(board, centerX + 1, centerY + 1); // bottom-right

  const occupiedCount =
    (cornerA ? 1 : 0) +
    (cornerB ? 1 : 0) +
    (cornerC ? 1 : 0) +
    (cornerD ? 1 : 0);

  // Step 5: Fewer than 3 → no T-Spin
  if (occupiedCount < 3) {
    return 'none';
  }

  // Step 6: Kick index 4 always yields proper
  if (piece.lastKickIndex === 4) {
    return 'proper';
  }

  // Step 7: Determine front corners by rotation state
  let frontCorner1: boolean;
  let frontCorner2: boolean;

  switch (piece.rotation) {
    case RotationState.SPAWN:
      // Front = top: A (top-left), B (top-right)
      frontCorner1 = cornerA;
      frontCorner2 = cornerB;
      break;
    case RotationState.RIGHT:
      // Front = right: B (top-right), D (bottom-right)
      frontCorner1 = cornerB;
      frontCorner2 = cornerD;
      break;
    case RotationState.FLIP:
      // Front = bottom: C (bottom-left), D (bottom-right)
      frontCorner1 = cornerC;
      frontCorner2 = cornerD;
      break;
    case RotationState.LEFT:
      // Front = left: A (top-left), C (bottom-left)
      frontCorner1 = cornerA;
      frontCorner2 = cornerC;
      break;
  }

  if (frontCorner1 && frontCorner2) {
    return 'proper';
  }

  return 'mini';
}

/**
 * A corner is occupied if:
 * - Out of bounds (wall or floor): occupied
 * - Grid cell is non-null: occupied
 * - Above the board top (y < 0): NOT occupied
 */
function isCornerOccupied(board: Board, x: number, y: number): boolean {
  // Above the board top → not occupied
  if (y < 0) {
    return false;
  }

  // Out of bounds (wall or floor) → occupied
  if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
    return true;
  }

  // Check grid cell
  return board.getCell(y, x) !== null;
}
