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

// Check if all tiles at absolute positions are in bounds and unoccupied
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

// Place piece tiles onto board, return new board
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

// Evaluate lines after a piece locks
export function evaluateLines(
  board: Board,
  lockedRows: Set<number>
): { board: Board; lockedRows: Set<number>; linesCleared: number } {
  const newBoard = board.map(row => [...row]);
  const newLocked = new Set(lockedRows);

  // Step 1: identify full rows and classify them
  const clearRows: number[] = [];
  const penaltyRows: number[] = [];

  for (let r = 0; r < VISIBLE_HEIGHT; r++) {
    if (newLocked.has(r)) continue; // locked rows can never be cleared
    if (isRowFull(newBoard, r)) {
      if (hasUniqueColors(newBoard, r)) {
        clearRows.push(r);
      } else {
        penaltyRows.push(r);
      }
    }
  }

  // Step 2: remove clear rows (process from top to avoid index shifting issues)
  // Sort descending so we remove from top first
  const sortedClears = [...clearRows].sort((a, b) => b - a);
  for (const r of sortedClears) {
    // Remove this row
    newBoard.splice(r, 1);
    // Add empty row at top
    newBoard.push(new Array<Cell>(BOARD_WIDTH).fill(null));

    // Update locked row indices: rows above the removed row shift down by 1
    const updatedLocked = new Set<number>();
    for (const lr of newLocked) {
      if (lr < r) {
        updatedLocked.add(lr);
      } else if (lr > r) {
        updatedLocked.add(lr - 1);
      }
      // lr === r: this locked row was cleared (shouldn't happen since locked rows
      // can't be cleared, but if a clear row was also locked, it gets removed)
    }
    newLocked.clear();
    for (const lr of updatedLocked) newLocked.add(lr);

    // Also shift penalty row indices that were above the removed row
    for (let i = 0; i < penaltyRows.length; i++) {
      if (penaltyRows[i] > r) penaltyRows[i]--;
    }
  }

  // Step 3: mark penalty rows as locked (after shift)
  for (const r of penaltyRows) {
    // Re-check that this row is still full after shifts
    if (r < VISIBLE_HEIGHT && isRowFull(newBoard, r)) {
      newLocked.add(r);
    }
  }

  return {
    board: newBoard,
    lockedRows: newLocked,
    linesCleared: clearRows.length,
  };
}

// Get the ghost row (lowest valid position directly below)
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
    colors.add(cell.color);
  }
  return colors.size === BOARD_WIDTH;
}
