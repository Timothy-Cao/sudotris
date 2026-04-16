import { PieceType, RotationState } from './types';

// Piece shapes: [row, col] offsets for each rotation state
// Row 0 = bottom of bounding box, col 0 = left
// Tiles listed in row-major order (top-to-bottom, left-to-right) for color assignment
type ShapeOffsets = [number, number][];

// All 7 tetrominoes with 4 rotation states each
// Using standard SRS/Guideline positions

const I_SHAPES: ShapeOffsets[] = [
  // State 0 (spawn)
  [[1, 0], [1, 1], [1, 2], [1, 3]],
  // State R (CW)
  [[3, 2], [2, 2], [1, 2], [0, 2]],
  // State 2 (180)
  [[2, 0], [2, 1], [2, 2], [2, 3]],
  // State L (CCW)
  [[3, 1], [2, 1], [1, 1], [0, 1]],
];

const O_SHAPES: ShapeOffsets[] = [
  [[1, 0], [1, 1], [0, 0], [0, 1]],
  [[1, 0], [1, 1], [0, 0], [0, 1]],
  [[1, 0], [1, 1], [0, 0], [0, 1]],
  [[1, 0], [1, 1], [0, 0], [0, 1]],
];

const T_SHAPES: ShapeOffsets[] = [
  // State 0
  [[1, 1], [0, 0], [0, 1], [0, 2]],
  // State R
  [[2, 1], [1, 1], [1, 2], [0, 1]],
  // State 2
  [[1, 0], [1, 1], [1, 2], [0, 1]],
  // State L
  [[2, 1], [1, 0], [1, 1], [0, 1]],
];

const S_SHAPES: ShapeOffsets[] = [
  [[1, 1], [1, 2], [0, 0], [0, 1]],
  [[2, 1], [1, 1], [1, 2], [0, 2]],
  [[1, 1], [1, 2], [0, 0], [0, 1]],
  [[2, 0], [1, 0], [1, 1], [0, 1]],
];

const Z_SHAPES: ShapeOffsets[] = [
  [[1, 0], [1, 1], [0, 1], [0, 2]],
  [[2, 2], [1, 1], [1, 2], [0, 1]],
  [[1, 0], [1, 1], [0, 1], [0, 2]],
  [[2, 1], [1, 1], [1, 0], [0, 0]],
];

const J_SHAPES: ShapeOffsets[] = [
  [[1, 0], [0, 0], [0, 1], [0, 2]],
  [[2, 1], [2, 2], [1, 1], [0, 1]],
  [[1, 0], [1, 1], [1, 2], [0, 2]],
  [[2, 1], [1, 1], [0, 0], [0, 1]],
];

const L_SHAPES: ShapeOffsets[] = [
  [[1, 2], [0, 0], [0, 1], [0, 2]],
  [[2, 1], [1, 1], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2], [0, 0]],
  [[2, 0], [2, 1], [1, 1], [0, 1]],
];

export const PIECE_SHAPES: Record<PieceType, ShapeOffsets[]> = {
  I: I_SHAPES,
  O: O_SHAPES,
  T: T_SHAPES,
  S: S_SHAPES,
  Z: Z_SHAPES,
  J: J_SHAPES,
  L: L_SHAPES,
};

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

// 180 rotation kicks (standard extended SRS)
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

  if (type === 'O') return [[0, 0]];

  // Check if 180 rotation
  if (Math.abs(from - to) === 2 || Math.abs(from - to) === 2) {
    const is180 = (from === 0 && to === 2) || (from === 2 && to === 0) ||
                  (from === 1 && to === 3) || (from === 3 && to === 1);
    if (is180) {
      const table = type === 'I' ? I_180_KICKS : JLSZT_180_KICKS;
      return table[key] || [[0, 0]];
    }
  }

  const table = type === 'I' ? I_KICKS : JLSZT_KICKS;
  return table[key] || [[0, 0]];
}

// Spawn column offset to center piece on 6-wide board
// I-piece is 4 wide -> center at col 1
// Others are 3 wide -> center at col 1 (leaving cols 1-3 for 3-wide, col 4-5 free)
export function getSpawnCol(type: PieceType): number {
  return type === 'I' ? 1 : 1;
}

// Spawn row: place piece so bottom of bounding box aligns with row 19
// (one row into spawn zone, standard guideline behavior)
export function getSpawnRow(type: PieceType): number {
  if (type === 'I') return 18; // I-piece: rows 18-21, visible tiles at row 19
  return 19; // 3-wide pieces: bounding box rows 0-1, origin at 19 puts tiles at 19-20
}

// Get shape offsets sorted in row-major order (top-to-bottom, left-to-right)
// This is the order used for color assignment
export function getRowMajorTiles(type: PieceType, rotation: RotationState): [number, number][] {
  const offsets = PIECE_SHAPES[type][rotation];
  return [...offsets].sort((a, b) => {
    // Top-to-bottom: higher row first (row is Y, higher = top in bounding box)
    if (a[0] !== b[0]) return b[0] - a[0];
    // Left-to-right
    return a[1] - b[1];
  });
}
