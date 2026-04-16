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
  const penaltyRows: number[] = [];

  for (let r = lockedRowCount; r < VISIBLE_HEIGHT; r++) {
    if (isRowFull(newBoard, r)) {
      if (hasUniqueColors(newBoard, r)) {
        clearRows.push(r);
      } else {
        penaltyRows.push(r);
      }
    }
  }

  // Step 2: remove clear rows AND penalty rows (both get deleted).
  // Sort all rows to remove descending so indices stay stable.
  const allRemoveRows = [...clearRows, ...penaltyRows].sort((a, b) => b - a);
  for (const r of allRemoveRows) {
    newBoard.splice(r, 1);
    newBoard.push(new Array<Cell>(BOARD_WIDTH).fill(null));
  }

  // Step 3: for each penalty row, insert a gray row at the bottom (row 0).
  // This frees the holes underneath the penalty row but adds gray at bottom.
  let newLockedCount = lockedRowCount;
  for (let p = 0; p < penaltyRows.length; p++) {
    newBoard.pop();
    newBoard.splice(0, 0, makeGrayRow());
    newLockedCount++;
  }

  return {
    board: newBoard,
    lockedRowCount: newLockedCount,
    linesCleared: clearRows.length,
  };
}

// Bomb explosion: clear cells in the blast zone, then apply gravity
// Returns cells destroyed count for potential scoring
export function explodeBomb(
  board: Board,
  bombRow: number,
  bombCol: number,
  bombType: 'BOMB_ROW' | 'BOMB_COL' | 'BOMB_3X3'
): { board: Board; cellsDestroyed: number } {
  const newBoard = board.map(row => [...row]);
  let destroyed = 0;

  if (bombType === 'BOMB_ROW') {
    // Clear entire row
    for (let c = 0; c < BOARD_WIDTH; c++) {
      if (newBoard[bombRow][c] !== null && !isGrayCell(newBoard[bombRow][c])) {
        newBoard[bombRow][c] = null;
        destroyed++;
      }
    }
  } else if (bombType === 'BOMB_COL') {
    // Clear entire column
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      if (newBoard[r][bombCol] !== null && !isGrayCell(newBoard[r][bombCol])) {
        newBoard[r][bombCol] = null;
        destroyed++;
      }
    }
  } else {
    // BOMB_3X3: clear 3x3 area centered on bomb
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = bombRow + dr;
        const c = bombCol + dc;
        if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
          if (newBoard[r][c] !== null && !isGrayCell(newBoard[r][c])) {
            newBoard[r][c] = null;
            destroyed++;
          }
        }
      }
    }
  }

  // The bomb itself is already cleared (it was in the blast zone)
  // Apply gravity: cells above empty spaces drop down
  for (let c = 0; c < BOARD_WIDTH; c++) {
    let writeIdx = 0;
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      if (newBoard[r][c] !== null) {
        if (r !== writeIdx) {
          newBoard[writeIdx][c] = newBoard[r][c];
          newBoard[r][c] = null;
        }
        writeIdx++;
      }
    }
  }

  return { board: newBoard, cellsDestroyed: destroyed };
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
