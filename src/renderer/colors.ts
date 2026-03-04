import { PieceType } from '../engine';

export const PIECE_COLORS: Record<PieceType, string> = {
  [PieceType.I]: '#00E5FF',
  [PieceType.O]: '#FFD600',
  [PieceType.T]: '#AA00FF',
  [PieceType.S]: '#00E676',
  [PieceType.Z]: '#FF1744',
  [PieceType.J]: '#2979FF',
  [PieceType.L]: '#FF9100',
};

export const BOARD_COLORS = {
  background: '#0A0A12',
  gridLine: 'rgba(255, 255, 255, 0.06)',
  gridBorder: '#1A1A2E',
  ghostPieceAlpha: 0.2,
  garbage: '#8A8A8A',
} as const;

export const TEXT_POPUP_COLORS = {
  quad: '#FFD600',
  tSpin: '#AA00FF',
  combo: '#FFFFFF',
  backToBack: '#FF9100',
} as const;
