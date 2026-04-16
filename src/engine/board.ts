import {
  Board,
  Cell,
  ActivePiece,
  TileColor,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
} from './types';

export function createBoard(): Board {
  const board: Board = [];
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    board.push(new Array<Cell>(BOARD_WIDTH).fill(null));
  }
  return board;
}

export function isValidPosition(
  board: Board,
  tileOffsets: [number, number][],
  pieceRow: number,
  pieceCol: number
): boolean {
  for (const [dr, dc] of tileOffsets) {
    const r = pieceRow + dr;
    const c = pieceCol + dc;
    if (r < 0 || r >= BOARD_HEIGHT || c < 0 || c >= BOARD_WIDTH) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

export function lockPiece(board: Board, piece: ActivePiece): Board {
  const newBoard = board.map(row => [...row]);
  for (const tile of piece.tiles) {
    const r = piece.row + tile.row;
    const c = piece.col + tile.col;
    if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
      newBoard[r][c] = { color: tile.color };
    }
  }
  return newBoard;
}

// Gray cell marker — color 0 is not a valid TileColor, so we use a sentinel.
// A "locked" (gray) cell is represented as { color: 0 as TileColor }.
export const GRAY_CELL: Cell = { color: 0 as TileColor };

export function isGrayCell(cell: Cell): boolean {
  return cell !== null && (cell.color as number) === 0;
}

function makeGrayRow(): Cell[] {
  return new Array(BOARD_WIDTH).fill(null).map(() => ({ color: 0 as TileColor }));
}

// Evaluate lines after a piece locks.
// lockedRowCount = number of gray rows at the bottom.
export function evaluateLines(
  board: Board,
  lockedRowCount: number
): { board: Board; lockedRowCount: number; linesCleared: number } {
  const newBoard = board.map(row => [...row]);

  // Step 1: identify full rows above the locked zone
  const clearRows: number[] = [];
  let penaltyCount = 0;

  for (let r = lockedRowCount; r < VISIBLE_HEIGHT; r++) {
    if (isRowFull(newBoard, r)) {
      if (hasUniqueColors(newBoard, r)) {
        clearRows.push(r);
      } else {
        penaltyCount++;
      }
    }
  }

  // Step 2: remove clear rows (top-down to keep indices stable)
  const sortedClears = [...clearRows].sort((a, b) => b - a);
  for (const r of sortedClears) {
    newBoard.splice(r, 1);
    newBoard.push(new Array<Cell>(BOARD_WIDTH).fill(null));
  }

  // Step 3: for each penalty, insert a gray row at the bottom (row 0)
  // and push everything up by 1. This shrinks playable space from below.
  let newLockedCount = lockedRowCount;
  for (let p = 0; p < penaltyCount; p++) {
    // Remove the topmost row (it falls off)
    newBoard.pop();
    // Insert gray row at position 0
    newBoard.splice(0, 0, makeGrayRow());
    newLockedCount++;
  }

  return {
    board: newBoard,
    lockedRowCount: newLockedCount,
    linesCleared: clearRows.length,
  };
}

export function getGhostRow(
  board: Board,
  piece: ActivePiece
): number {
  const offsets = piece.tiles.map(t => [t.row, t.col] as [number, number]);
  let row = piece.row;
  while (row > 0 && isValidPosition(board, offsets, row - 1, piece.col)) {
    row--;
  }
  return row;
}

function isRowFull(board: Board, row: number): boolean {
  for (let c = 0; c < BOARD_WIDTH; c++) {
    if (board[row][c] === null) return false;
  }
  return true;
}

function hasUniqueColors(board: Board, row: number): boolean {
  const colors = new Set<TileColor>();
  for (let c = 0; c < BOARD_WIDTH; c++) {
    const cell = board[row][c];
    if (cell === null) return false;
    if (isGrayCell(cell)) return false; // gray cells don't count as colored
    colors.add(cell.color);
  }
  return colors.size === BOARD_WIDTH;
}
