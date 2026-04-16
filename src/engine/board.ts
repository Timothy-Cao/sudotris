import {
  Board,
  Cell,
  ActivePiece,
  TileColor,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
  NUM_COLORS,
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

// Sudoku clear: find groups of 4 cells in a row, column, or 2x2 square
// that contain all NUM_COLORS unique colors. Clear them.
// Only checks around newly placed tile positions for performance.
// Returns the updated board, number of clears, and cleared cell positions.
export function evaluateSudokuClears(
  board: Board,
  newTilePositions: { row: number; col: number }[]
): { board: Board; clears: number; clearedCells: { row: number; col: number }[] } {
  const newBoard = board.map(row => [...row]);
  let totalClears = 0;
  const allClearedCells: { row: number; col: number }[] = [];

  // Keep clearing until no more clears found (chain reaction)
  let foundClear = true;
  while (foundClear) {
    foundClear = false;

    // Collect candidate groups to check — scan around affected cells
    // For efficiency, use a set of rows/cols that were touched
    const affectedRows = new Set<number>();
    const affectedCols = new Set<number>();
    if (totalClears === 0) {
      // First pass: only check around newly placed tiles
      for (const pos of newTilePositions) {
        affectedRows.add(pos.row);
        affectedCols.add(pos.col);
      }
    } else {
      // Subsequent passes (chain reactions): check around previously cleared cells
      for (const pos of allClearedCells) {
        affectedRows.add(pos.row);
        affectedCols.add(pos.col);
      }
    }

    // Find the first valid clear (leftmost, then highest for tie-breaking)
    let bestClear: { row: number; col: number }[] | null = null;
    let bestScore = Infinity; // lower = higher priority (leftmost, highest)

    // Check horizontal groups of 4 in affected rows
    for (const r of affectedRows) {
      if (r < 0 || r >= BOARD_HEIGHT) continue;
      for (let c = 0; c <= BOARD_WIDTH - NUM_COLORS; c++) {
        const group = checkGroup(newBoard, Array.from({ length: NUM_COLORS }, (_, i) => ({ row: r, col: c + i })));
        if (group) {
          const score = c * 1000 + (BOARD_HEIGHT - r); // prefer leftmost, then highest
          if (score < bestScore) {
            bestScore = score;
            bestClear = group;
          }
        }
      }
    }

    // Check vertical groups of 4 in affected columns
    for (const c of affectedCols) {
      if (c < 0 || c >= BOARD_WIDTH) continue;
      for (let r = 0; r <= BOARD_HEIGHT - NUM_COLORS; r++) {
        const group = checkGroup(newBoard, Array.from({ length: NUM_COLORS }, (_, i) => ({ row: r + i, col: c })));
        if (group) {
          const score = c * 1000 + (BOARD_HEIGHT - r);
          if (score < bestScore) {
            bestScore = score;
            bestClear = group;
          }
        }
      }
    }

    // Check 2x2 squares around affected positions
    const checked2x2 = new Set<string>();
    for (const r of affectedRows) {
      for (const c of affectedCols) {
        // Check all 2x2 squares that include (r, c)
        for (let dr = -1; dr <= 0; dr++) {
          for (let dc = -1; dc <= 0; dc++) {
            const tr = r + dr;
            const tc = c + dc;
            const key = `${tr},${tc}`;
            if (checked2x2.has(key)) continue;
            checked2x2.add(key);
            if (tr < 0 || tr + 1 >= BOARD_HEIGHT || tc < 0 || tc + 1 >= BOARD_WIDTH) continue;
            const group = checkGroup(newBoard, [
              { row: tr, col: tc }, { row: tr, col: tc + 1 },
              { row: tr + 1, col: tc }, { row: tr + 1, col: tc + 1 },
            ]);
            if (group) {
              const score = tc * 1000 + (BOARD_HEIGHT - tr);
              if (score < bestScore) {
                bestScore = score;
                bestClear = group;
              }
            }
          }
        }
      }
    }

    if (bestClear) {
      foundClear = true;
      totalClears++;
      for (const pos of bestClear) {
        newBoard[pos.row][pos.col] = null;
        allClearedCells.push(pos);
      }
      // After clearing, apply gravity so tiles above drop down
      applyGravity(newBoard);
    }
  }

  return { board: newBoard, clears: totalClears, clearedCells: allClearedCells };
}

// Check if a group of positions contains all NUM_COLORS unique colors
function checkGroup(
  board: Board,
  positions: { row: number; col: number }[]
): { row: number; col: number }[] | null {
  if (positions.length !== NUM_COLORS) return null;
  const colors = new Set<TileColor>();
  for (const pos of positions) {
    const cell = board[pos.row]?.[pos.col];
    if (!cell) return null;
    colors.add(cell.color);
  }
  return colors.size === NUM_COLORS ? positions : null;
}

// Apply gravity: cells drop down to fill empty spaces
function applyGravity(board: Board): void {
  for (let c = 0; c < BOARD_WIDTH; c++) {
    let writeIdx = 0;
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      if (board[r][c] !== null) {
        if (r !== writeIdx) {
          board[writeIdx][c] = board[r][c];
          board[r][c] = null;
        }
        writeIdx++;
      }
    }
  }
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

// Keep these exports for interface compat (unused now)
export function isGrayCell(cell: Cell): boolean {
  return cell !== null && (cell.color as number) === 0;
}
