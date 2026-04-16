import {
  GameState,
  TileColor,
  PieceType,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
} from '../engine/types';
import { PIECE_SHAPES } from '../engine/pieces';
import { drawAnimations } from './animations';
import {
  TILE_COLORS,
  TILE_BORDER_COLORS,
  BOARD_BG,
  GRID_LINE,
  CELL_SIZE,
} from './colors';

export const TOTAL_VISIBLE_ROWS = 20; // 18 playfield + 2 spawn zone

function boardRowToCanvasY(row: number): number {
  return (TOTAL_VISIBLE_ROWS - 1 - row) * CELL_SIZE;
}

// Render settings
let _showNumbers = false;
let _ghostAlpha = 0.3;
export function setRenderSettings(showNumbers: boolean, ghostOpacity: number) {
  _showNumbers = showNumbers;
  _ghostAlpha = ghostOpacity / 100;
}

function drawTileAt(
  ctx: CanvasRenderingContext2D,
  canvasX: number,
  canvasY: number,
  color: TileColor,
  alpha: number = 1
): void {
  ctx.globalAlpha = alpha;

  ctx.fillStyle = TILE_COLORS[color];
  ctx.fillRect(canvasX + 1, canvasY + 1, CELL_SIZE - 2, CELL_SIZE - 2);

  ctx.strokeStyle = TILE_BORDER_COLORS[color];
  ctx.lineWidth = 2;
  ctx.strokeRect(canvasX + 1, canvasY + 1, CELL_SIZE - 2, CELL_SIZE - 2);

  if (_showNumbers) {
    const fontSize = Math.floor(CELL_SIZE * 0.45);
    const cx = canvasX + CELL_SIZE / 2;
    const cy = canvasY + CELL_SIZE / 2;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.7})`;
    ctx.lineWidth = 3;
    ctx.strokeText(String(color), cx, cy);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
    ctx.fillText(String(color), cx, cy);
  }

  ctx.globalAlpha = 1;
}

export function drawBoard(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { board, activePiece, ghostRow } = state;

  // Clear
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, BOARD_WIDTH * CELL_SIZE, TOTAL_VISIBLE_ROWS * CELL_SIZE);

  // Grid lines
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  for (let c = 1; c < BOARD_WIDTH; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_SIZE, 0);
    ctx.lineTo(c * CELL_SIZE, TOTAL_VISIBLE_ROWS * CELL_SIZE);
    ctx.stroke();
  }
  for (let r = 1; r < TOTAL_VISIBLE_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_SIZE);
    ctx.lineTo(BOARD_WIDTH * CELL_SIZE, r * CELL_SIZE);
    ctx.stroke();
  }

  // Red dashed line at row 18 boundary
  const dangerLineY = boardRowToCanvasY(VISIBLE_HEIGHT - 1);
  ctx.save();
  ctx.strokeStyle = '#FF2222';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, dangerLineY);
  ctx.lineTo(BOARD_WIDTH * CELL_SIZE, dangerLineY);
  ctx.stroke();
  ctx.restore();

  // Draw placed tiles
  for (let r = 0; r < TOTAL_VISIBLE_ROWS; r++) {
    for (let c = 0; c < BOARD_WIDTH; c++) {
      const cell = board[r]?.[c];
      if (cell) {
        drawTileAt(ctx, c * CELL_SIZE, boardRowToCanvasY(r), cell.color);
      }
    }
  }

  // Draw ghost piece
  if (activePiece && ghostRow !== null && ghostRow !== activePiece.row) {
    for (const tile of activePiece.tiles) {
      const r = ghostRow + tile.row;
      const c = activePiece.col + tile.col;
      if (r >= 0 && r < TOTAL_VISIBLE_ROWS && c >= 0 && c < BOARD_WIDTH) {
        drawTileAt(ctx, c * CELL_SIZE, boardRowToCanvasY(r), tile.color, _ghostAlpha);
      }
    }
  }

  // Draw active piece
  if (activePiece) {
    for (const tile of activePiece.tiles) {
      const r = activePiece.row + tile.row;
      const c = activePiece.col + tile.col;
      if (r >= 0 && r < TOTAL_VISIBLE_ROWS && c >= 0 && c < BOARD_WIDTH) {
        drawTileAt(ctx, c * CELL_SIZE, boardRowToCanvasY(r), tile.color);
      }
    }
  }

  // Animations
  drawAnimations(ctx);
}

// Preview rendering
const PREVIEW_CELL = 24;
const PREVIEW_GAP = 12;

function drawPreviewTile(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  color: TileColor, alpha: number
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = TILE_COLORS[color];
  ctx.fillRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
  ctx.strokeStyle = TILE_BORDER_COLORS[color];
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
  if (_showNumbers) {
    const fontSize = Math.floor(PREVIEW_CELL * 0.45);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.strokeText(String(color), cx + PREVIEW_CELL / 2, cy + PREVIEW_CELL / 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
    ctx.fillText(String(color), cx + PREVIEW_CELL / 2, cy + PREVIEW_CELL / 2);
  }
  ctx.globalAlpha = 1;
}

function drawPiecePreview(
  ctx: CanvasRenderingContext2D,
  piece: { type: PieceType; colors: TileColor[] },
  centerX: number, centerY: number,
  alpha: number
) {
  const offsets = PIECE_SHAPES[piece.type][0];
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const [r, c] of offsets) {
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }
  const pw = (maxC - minC + 1) * PREVIEW_CELL;
  const ph = (maxR - minR + 1) * PREVIEW_CELL;
  const ox = centerX - pw / 2;
  const oy = centerY - ph / 2;

  offsets.forEach((offset: [number, number], i: number) => {
    const [r, c] = offset;
    drawPreviewTile(ctx, ox + (c - minC) * PREVIEW_CELL, oy + (maxR - r) * PREVIEW_CELL, piece.colors[i], alpha);
  });
}

export function drawNextPieces(
  ctx: CanvasRenderingContext2D,
  pieces: { type: PieceType; colors: TileColor[] }[]
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, width, height);
  if (pieces.length === 0) return;

  const slotHeight = (height - PREVIEW_GAP * (pieces.length - 1)) / pieces.length;
  pieces.forEach((piece, idx) => {
    const slotY = idx * (slotHeight + PREVIEW_GAP);
    const alpha = idx === 0 ? 1 : 0.6;
    drawPiecePreview(ctx, piece, width / 2, slotY + slotHeight / 2, alpha);
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
  drawPiecePreview(ctx, piece, width / 2, height / 2, canHold ? 1 : 0.35);
}
