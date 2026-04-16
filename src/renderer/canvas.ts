import {
  GameState,
  TileColor,
  PieceType,
  BOARD_WIDTH,
  VISIBLE_HEIGHT,
} from '../engine/types';
import { getRowMajorTiles } from '../engine/pieces';
import { isGrayCell } from '../engine/board';
import {
  TILE_COLORS,
  TILE_BORDER_COLORS,
  GHOST_ALPHA,
  LOCKED_ROW_COLOR,
  LOCKED_ROW_BORDER,
  BOARD_BG,
  GRID_LINE,
  CELL_SIZE,
} from './colors';

export const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE;
export const CANVAS_HEIGHT = VISIBLE_HEIGHT * CELL_SIZE;

function boardRowToCanvasY(row: number): number {
  // Row 0 = bottom of board = bottom of canvas
  return (VISIBLE_HEIGHT - 1 - row) * CELL_SIZE;
}

function drawTileAt(
  ctx: CanvasRenderingContext2D,
  canvasX: number,
  canvasY: number,
  color: TileColor,
  alpha: number = 1
): void {
  const fillColor = TILE_COLORS[color];
  const borderColor = TILE_BORDER_COLORS[color];

  ctx.globalAlpha = alpha;

  // Fill
  ctx.fillStyle = fillColor;
  ctx.fillRect(canvasX + 1, canvasY + 1, CELL_SIZE - 2, CELL_SIZE - 2);

  // Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(canvasX + 1, canvasY + 1, CELL_SIZE - 2, CELL_SIZE - 2);

  ctx.globalAlpha = 1;
}

export function drawBoard(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { board, activePiece, ghostRow } = state;

  // Clear
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grid lines
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  for (let c = 1; c < BOARD_WIDTH; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_SIZE, 0);
    ctx.lineTo(c * CELL_SIZE, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let r = 1; r < VISIBLE_HEIGHT; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_SIZE);
    ctx.lineTo(CANVAS_WIDTH, r * CELL_SIZE);
    ctx.stroke();
  }

  // Draw placed tiles (only visible rows 0-17)
  for (let r = 0; r < VISIBLE_HEIGHT; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      const cell = board[r][c];
      if (cell) {
        const cx = c * CELL_SIZE;
        const cy = boardRowToCanvasY(r);
        if (isGrayCell(cell)) {
          // Gray locked cell
          ctx.fillStyle = LOCKED_ROW_COLOR;
          ctx.fillRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = LOCKED_ROW_BORDER;
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        } else {
          drawTileAt(ctx, cx, cy, cell.color);
        }
      }
    }
  }

  // Draw ghost piece
  if (activePiece && ghostRow !== null && ghostRow !== activePiece.row) {
    for (const tile of activePiece.tiles) {
      const r = ghostRow + tile.row;
      const c = activePiece.col + tile.col;
      if (r >= 0 && r < VISIBLE_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
        const cx = c * CELL_SIZE;
        const cy = boardRowToCanvasY(r);
        drawTileAt(ctx, cx, cy, tile.color, GHOST_ALPHA);
      }
    }
  }

  // Draw active piece
  if (activePiece) {
    for (const tile of activePiece.tiles) {
      const r = activePiece.row + tile.row;
      const c = activePiece.col + tile.col;
      if (r >= 0 && r < VISIBLE_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
        const cx = c * CELL_SIZE;
        const cy = boardRowToCanvasY(r);
        drawTileAt(ctx, cx, cy, tile.color);
      }
    }
  }
}

// Draw next piece preview
const PREVIEW_CELL = 28;

export function drawNextPiece(
  ctx: CanvasRenderingContext2D,
  piece: { type: PieceType; colors: TileColor[] } | null
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, width, height);

  if (!piece) return;

  // Get the spawn (rotation 0) shape offsets
  const offsets: [number, number][] = getRowMajorTiles(piece.type, 0);

  // Find bounding box to center
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const [r, c] of offsets) {
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  }

  const pieceW = (maxC - minC + 1) * PREVIEW_CELL;
  const pieceH = (maxR - minR + 1) * PREVIEW_CELL;
  const offsetX = (width - pieceW) / 2;
  const offsetY = (height - pieceH) / 2;

  offsets.forEach((offset: [number, number], i: number) => {
    const [r, c] = offset;
    const cx = offsetX + (c - minC) * PREVIEW_CELL;
    // Flip Y so higher rows are at top
    const cy = offsetY + (maxR - r) * PREVIEW_CELL;
    const color = piece.colors[i];

    ctx.globalAlpha = 1;
    ctx.fillStyle = TILE_COLORS[color];
    ctx.fillRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);

    ctx.strokeStyle = TILE_BORDER_COLORS[color];
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
  });
}
