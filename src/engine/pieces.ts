import { PieceType, RotationState } from './types';

// Piece shapes: [row, col] offsets for each rotation state.
// CRITICAL: Within each piece, tile index N in state 0 corresponds to
// tile index N in all other states. This ensures colors bound at spawn
// stay on the same physical block through rotations.
//
// Row 0 = bottom of bounding box, col 0 = left.
type ShapeOffsets = [number, number][];

// I-piece: tiles ordered left-to-right in spawn state
const I_SHAPES: ShapeOffsets[] = [
  // State 0 (spawn): horizontal, row 1
  [[1, 0], [1, 1], [1, 2], [1, 3]],
  // State R (CW): vertical, col 2, top-to-bottom
  [[3, 2], [2, 2], [1, 2], [0, 2]],
  // State 2 (180): horizontal, row 2
  [[2, 3], [2, 2], [2, 1], [2, 0]],
  // State L (CCW): vertical, col 1, bottom-to-top
  [[0, 1], [1, 1], [2, 1], [3, 1]],
];

// O-piece: no rotation, all states identical
const O_SHAPES: ShapeOffsets[] = [
  [[1, 0], [1, 1], [0, 0], [0, 1]],
  [[1, 0], [1, 1], [0, 0], [0, 1]],
  [[1, 0], [1, 1], [0, 0], [0, 1]],
  [[1, 0], [1, 1], [0, 0], [0, 1]],
];

// T-piece: [0]=top-center(nub), [1]=left, [2]=center, [3]=right in spawn
const T_SHAPES: ShapeOffsets[] = [
  // State 0: nub on top
  [[1, 1], [0, 0], [0, 1], [0, 2]],
  // State R: nub on right
  [[1, 2], [2, 1], [1, 1], [0, 1]],
  // State 2: nub on bottom
  [[0, 1], [1, 2], [1, 1], [1, 0]],
  // State L: nub on left
  [[1, 0], [0, 1], [1, 1], [2, 1]],
];

// S-piece: [0]=top-right, [1]=top-left(or mid), [2]=bottom-right(or mid), [3]=bottom-left
const S_SHAPES: ShapeOffsets[] = [
  // State 0
  [[1, 1], [1, 2], [0, 0], [0, 1]],
  // State R
  [[2, 1], [1, 2], [1, 1], [0, 2]],
  // State 2
  [[1, 1], [1, 2], [0, 0], [0, 1]],
  // State L
  [[2, 0], [1, 1], [1, 0], [0, 1]],
];

// Z-piece
const Z_SHAPES: ShapeOffsets[] = [
  // State 0
  [[1, 0], [1, 1], [0, 1], [0, 2]],
  // State R
  [[2, 2], [1, 1], [1, 2], [0, 1]],
  // State 2
  [[1, 0], [1, 1], [0, 1], [0, 2]],
  // State L
  [[2, 1], [1, 1], [1, 0], [0, 0]],
];

// J-piece: [0]=corner, [1]=flat-left, [2]=flat-center, [3]=flat-right in spawn
const J_SHAPES: ShapeOffsets[] = [
  // State 0: corner top-left
  [[1, 0], [0, 0], [0, 1], [0, 2]],
  // State R: corner top-right
  [[2, 1], [2, 2], [1, 1], [0, 1]],
  // State 2: corner bottom-right
  [[0, 2], [1, 2], [1, 1], [1, 0]],
  // State L: corner bottom-left
  [[0, 1], [0, 0], [1, 1], [2, 1]],
];

// L-piece: [0]=corner, [1]=flat-left, [2]=flat-center, [3]=flat-right in spawn
const L_SHAPES: ShapeOffsets[] = [
  // State 0: corner top-right
  [[1, 2], [0, 0], [0, 1], [0, 2]],
  // State R: corner bottom-right
  [[2, 1], [1, 1], [0, 1], [0, 2]],
  // State 2: corner bottom-left
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  // State L: corner top-left
  [[2, 0], [2, 1], [1, 1], [0, 1]],
];

// Bomb pieces: 1x1, all rotation states identical
const BOMB_SHAPE: ShapeOffsets[] = [
  [[0, 0]], [[0, 0]], [[0, 0]], [[0, 0]],
];

export const PIECE_SHAPES: Record<PieceType, ShapeOffsets[]> = {
  I: I_SHAPES,
  O: O_SHAPES,
  T: T_SHAPES,
  S: S_SHAPES,
  Z: Z_SHAPES,
  J: J_SHAPES,
  L: L_SHAPES,
  BOMB_ROW: BOMB_SHAPE,
  BOMB_COL: BOMB_SHAPE,
  BOMB_3X3: BOMB_SHAPE,
};

export function isBombType(type: PieceType): boolean {
  return type === 'BOMB_ROW' || type === 'BOMB_COL' || type === 'BOMB_3X3';
}

// SRS kick data: offsets to try when rotation fails
// Format: [dx (col), dy (row)] — positive dx = right, positive dy = up
type KickData = [number, number][];

// Standard JLSZT kick data
const JLSZT_KICKS: Record<string, KickData> = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

// I-piece kick data (separate table)
const I_KICKS: Record<string, KickData> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// 180 rotation kicks
const JLSZT_180_KICKS: Record<string, KickData> = {
  '0>2': [[0, 0], [0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0]],
  '2>0': [[0, 0], [0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0]],
  '1>3': [[0, 0], [1, 0], [1, 2], [1, 1], [0, 2], [0, 1]],
  '3>1': [[0, 0], [-1, 0], [-1, 2], [-1, 1], [0, 2], [0, 1]],
};

const I_180_KICKS: Record<string, KickData> = {
  '0>2': [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]],
  '2>0': [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]],
  '1>3': [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],
  '3>1': [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
};

export function getKicks(
  type: PieceType,
  from: RotationState,
  to: RotationState
): KickData {
  const key = `${from}>${to}`;

  if (type === 'O' || isBombType(type)) return [[0, 0]];

  // Check if 180 rotation
  const is180 = (from === 0 && to === 2) || (from === 2 && to === 0) ||
                (from === 1 && to === 3) || (from === 3 && to === 1);
  if (is180) {
    const table = type === 'I' ? I_180_KICKS : JLSZT_180_KICKS;
    return table[key] || [[0, 0]];
  }

  const table = type === 'I' ? I_KICKS : JLSZT_KICKS;
  return table[key] || [[0, 0]];
}

// Spawn column offset to center piece on 6-wide board
export function getSpawnCol(type: PieceType): number {
  if (isBombType(type)) return 3; // center-ish for 1x1
  return type === 'I' ? 1 : 1;
}

// Spawn row
export function getSpawnRow(type: PieceType): number {
  if (isBombType(type)) return 20; // 1x1 spawns at top of spawn zone
  if (type === 'I') return 18;
  return 19;
}

// Get shape offsets sorted in row-major order (top-to-bottom, left-to-right)
// Used ONLY for initial color assignment at spawn
export function getRowMajorTiles(type: PieceType, rotation: RotationState): [number, number][] {
  const offsets = PIECE_SHAPES[type][rotation];
  return [...offsets].sort((a, b) => {
    if (a[0] !== b[0]) return b[0] - a[0];
    return a[1] - b[1];
  });
}
