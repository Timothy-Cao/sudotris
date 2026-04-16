import {
  GameState,
  TileColor,
  PieceType,
  BOARD_WIDTH,
  VISIBLE_HEIGHT,
} from '../engine/types';
import { PIECE_SHAPES } from '../engine/pieces';
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

const TOTAL_VISIBLE_ROWS = 21; // 18 playfield + 3 spawn zone
export const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE;
export const CANVAS_HEIGHT = TOTAL_VISIBLE_ROWS * CELL_SIZE;

function boardRowToCanvasY(row: number): number {
  // Row 0 = bottom of board = bottom of canvas
  return (TOTAL_VISIBLE_ROWS - 1 - row) * CELL_SIZE;
}

// Track whether to show numbers (set before each drawBoard call)
let _showNumbers = false;
export function setShowNumbers(show: boolean) { _showNumbers = show; }

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

  // Number overlay (optional, with dark outline for visibility on any color)
  if (_showNumbers) {
    const fontSize = Math.floor(CELL_SIZE * 0.45);
    const cx = canvasX + CELL_SIZE / 2;
    const cy = canvasY + CELL_SIZE / 2;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dark stroke for contrast on light tiles
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.7})`;
    ctx.lineWidth = 3;
    ctx.strokeText(String(color), cx, cy);
    // White fill
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
    ctx.fillText(String(color), cx, cy);
  }

  ctx.globalAlpha = 1;
}

export function drawBoard(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { board, activePiece, ghostRow } = state;

  // Clear
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grid lines (all 21 rows)
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  for (let c = 1; c < BOARD_WIDTH; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_SIZE, 0);
    ctx.lineTo(c * CELL_SIZE, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let r = 1; r < TOTAL_VISIBLE_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_SIZE);
    ctx.lineTo(CANVAS_WIDTH, r * CELL_SIZE);
    ctx.stroke();
  }

  // Red dashed line at row 18 boundary (top of playfield / bottom of spawn zone)
  const dangerLineY = boardRowToCanvasY(VISIBLE_HEIGHT - 1);
  ctx.save();
  ctx.strokeStyle = '#FF2222';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, dangerLineY);
  ctx.lineTo(CANVAS_WIDTH, dangerLineY);
  ctx.stroke();
  ctx.restore();

  // Draw placed tiles (all 21 rows)
  for (let r = 0; r < TOTAL_VISIBLE_ROWS; r++) {
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
      if (r >= 0 && r < TOTAL_VISIBLE_ROWS && c >= 0 && c < BOARD_WIDTH) {
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
      if (r >= 0 && r < TOTAL_VISIBLE_ROWS && c >= 0 && c < BOARD_WIDTH) {
        const cx = c * CELL_SIZE;
        const cy = boardRowToCanvasY(r);
        drawTileAt(ctx, cx, cy, tile.color);
      }
    }
  }
}

// Draw next pieces preview (up to 3)
const PREVIEW_CELL = 24;
const PREVIEW_GAP = 12;

export function drawNextPieces(
  ctx: CanvasRenderingContext2D,
  pieces: { type: PieceType; colors: TileColor[] }[]
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, width, height);

  if (pieces.length === 0) return;

  // Each piece gets a vertical slot
  const slotHeight = (height - PREVIEW_GAP * (pieces.length - 1)) / pieces.length;

  pieces.forEach((piece, idx) => {
    const slotY = idx * (slotHeight + PREVIEW_GAP);
    const offsets = PIECE_SHAPES[piece.type][0]; // spawn state

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
    const offsetY = slotY + (slotHeight - pieceH) / 2;

    offsets.forEach((offset: [number, number], i: number) => {
      const [r, c] = offset;
      const cx = offsetX + (c - minC) * PREVIEW_CELL;
      const cy = offsetY + (maxR - r) * PREVIEW_CELL;
      const color = piece.colors[i];

      // Fade subsequent previews slightly
      const alpha = idx === 0 ? 1 : 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = TILE_COLORS[color];
      ctx.fillRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);

      ctx.strokeStyle = TILE_BORDER_COLORS[color];
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
    });
    ctx.globalAlpha = 1;
  });
}

export function drawHoldPiece(
  ctx: CanvasRenderingContext2D,
  piece: { type: PieceType; colors: TileColor[] } | null,
  canHold: boolean
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, width, height);

  if (!piece) return;

  const offsets = PIECE_SHAPES[piece.type][0];
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const [r, c] of offsets) {
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }

  const pieceW = (maxC - minC + 1) * PREVIEW_CELL;
  const pieceH = (maxR - minR + 1) * PREVIEW_CELL;
  const offsetX = (width - pieceW) / 2;
  const offsetY = (height - pieceH) / 2;
  const alpha = canHold ? 1 : 0.35;

  offsets.forEach((offset: [number, number], i: number) => {
    const [r, c] = offset;
    const cx = offsetX + (c - minC) * PREVIEW_CELL;
    const cy = offsetY + (maxR - r) * PREVIEW_CELL;
    const color = piece.colors[i];

    ctx.globalAlpha = alpha;
    ctx.fillStyle = TILE_COLORS[color];
    ctx.fillRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
    ctx.strokeStyle = TILE_BORDER_COLORS[color];
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
  });
  ctx.globalAlpha = 1;
}
