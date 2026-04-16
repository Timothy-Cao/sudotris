import {
  GameState,
  TileColor,
  PieceType,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
} from '../engine/types';
import { PIECE_SHAPES, isBombType } from '../engine/pieces';
import { isGrayCell } from '../engine/board';
import { drawAnimations } from './animations';
import {
  TILE_COLORS,
  TILE_BORDER_COLORS,
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

// Render settings (set before each drawBoard call)
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

function drawBombAt(
  ctx: CanvasRenderingContext2D,
  canvasX: number,
  canvasY: number,
  bombType: PieceType,
  size: number,
  alpha: number = 1
): void {
  ctx.globalAlpha = alpha;
  const cx = canvasX + size / 2;
  const cy = canvasY + size / 2;
  const pad = 4;

  // Background
  ctx.fillStyle = '#1a0808';
  ctx.fillRect(canvasX + 1, canvasY + 1, size - 2, size - 2);

  // Border — color hints at type
  const borderColor = bombType === 'BOMB_ROW' ? '#FF6633'
    : bombType === 'BOMB_COL' ? '#33AAFF'
    : '#FFCC00';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(canvasX + 1, canvasY + 1, size - 2, size - 2);

  // Inner icon showing blast shape
  ctx.strokeStyle = borderColor;
  ctx.fillStyle = borderColor;
  ctx.lineWidth = 3;

  if (bombType === 'BOMB_ROW') {
    // Horizontal arrow/line
    ctx.beginPath();
    ctx.moveTo(canvasX + pad, cy);
    ctx.lineTo(canvasX + size - pad, cy);
    ctx.stroke();
    // Arrow heads
    ctx.beginPath();
    ctx.moveTo(canvasX + pad, cy);
    ctx.lineTo(canvasX + pad + 6, cy - 4);
    ctx.lineTo(canvasX + pad + 6, cy + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(canvasX + size - pad, cy);
    ctx.lineTo(canvasX + size - pad - 6, cy - 4);
    ctx.lineTo(canvasX + size - pad - 6, cy + 4);
    ctx.fill();
  } else if (bombType === 'BOMB_COL') {
    // Vertical arrow/line
    ctx.beginPath();
    ctx.moveTo(cx, canvasY + pad);
    ctx.lineTo(cx, canvasY + size - pad);
    ctx.stroke();
    // Arrow heads
    ctx.beginPath();
    ctx.moveTo(cx, canvasY + pad);
    ctx.lineTo(cx - 4, canvasY + pad + 6);
    ctx.lineTo(cx + 4, canvasY + pad + 6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, canvasY + size - pad);
    ctx.lineTo(cx - 4, canvasY + size - pad - 6);
    ctx.lineTo(cx + 4, canvasY + size - pad - 6);
    ctx.fill();
  } else {
    // 3x3 square outline
    const sqSize = size * 0.55;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - sqSize / 2, cy - sqSize / 2, sqSize, sqSize);
    // Cross-hair dot in center
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
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

  // Draw bomb blast zone shadow (at ghost position)
  if (activePiece && ghostRow !== null && isBombType(activePiece.type)) {
    const bombRow = ghostRow + activePiece.tiles[0].row;
    const bombCol = activePiece.col + activePiece.tiles[0].col;
    const bombType = activePiece.type;

    const blastColor = bombType === 'BOMB_ROW' ? 'rgba(255, 100, 50, 0.15)'
      : bombType === 'BOMB_COL' ? 'rgba(50, 170, 255, 0.15)'
      : 'rgba(255, 200, 0, 0.15)';
    const blastBorder = bombType === 'BOMB_ROW' ? 'rgba(255, 100, 50, 0.35)'
      : bombType === 'BOMB_COL' ? 'rgba(50, 170, 255, 0.35)'
      : 'rgba(255, 200, 0, 0.35)';

    ctx.fillStyle = blastColor;
    ctx.strokeStyle = blastBorder;
    ctx.lineWidth = 1;

    if (bombType === 'BOMB_ROW') {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const cy = boardRowToCanvasY(bombRow);
        ctx.fillRect(c * CELL_SIZE, cy, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(c * CELL_SIZE + 0.5, cy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    } else if (bombType === 'BOMB_COL') {
      for (let r = 0; r < BOARD_HEIGHT; r++) {
        if (r >= TOTAL_VISIBLE_ROWS) continue;
        const cy = boardRowToCanvasY(r);
        ctx.fillRect(bombCol * CELL_SIZE, cy, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(bombCol * CELL_SIZE + 0.5, cy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    } else {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = bombRow + dr;
          const c = bombCol + dc;
          if (r >= 0 && r < TOTAL_VISIBLE_ROWS && c >= 0 && c < BOARD_WIDTH) {
            const cy = boardRowToCanvasY(r);
            ctx.fillRect(c * CELL_SIZE, cy, CELL_SIZE, CELL_SIZE);
            ctx.strokeRect(c * CELL_SIZE + 0.5, cy + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
          }
        }
      }
    }
  }

  // Draw ghost piece
  if (activePiece && ghostRow !== null && ghostRow !== activePiece.row) {
    const isBomb = isBombType(activePiece.type);
    for (const tile of activePiece.tiles) {
      const r = ghostRow + tile.row;
      const c = activePiece.col + tile.col;
      if (r >= 0 && r < TOTAL_VISIBLE_ROWS && c >= 0 && c < BOARD_WIDTH) {
        const cx = c * CELL_SIZE;
        const cy = boardRowToCanvasY(r);
        if (isBomb) {
          drawBombAt(ctx, cx, cy, activePiece.type, CELL_SIZE, _ghostAlpha);
        } else {
          drawTileAt(ctx, cx, cy, tile.color, _ghostAlpha);
        }
      }
    }
  }

  // Draw active piece
  if (activePiece) {
    const isBomb = isBombType(activePiece.type);
    for (const tile of activePiece.tiles) {
      const r = activePiece.row + tile.row;
      const c = activePiece.col + tile.col;
      if (r >= 0 && r < TOTAL_VISIBLE_ROWS && c >= 0 && c < BOARD_WIDTH) {
        const cx = c * CELL_SIZE;
        const cy = boardRowToCanvasY(r);
        if (isBomb) {
          drawBombAt(ctx, cx, cy, activePiece.type, CELL_SIZE);
        } else {
          drawTileAt(ctx, cx, cy, tile.color);
        }
      }
    }
  }

  // Draw animations on top of everything
  drawAnimations(ctx);
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

    const isBomb = isBombType(piece.type);
    if (isBomb) {
      const cx = (width - PREVIEW_CELL) / 2;
      const cy = slotY + (slotHeight - PREVIEW_CELL) / 2;
      const alpha = idx === 0 ? 1 : 0.6;
      drawBombAt(ctx, cx, cy, piece.type, PREVIEW_CELL, alpha);
    } else {
      offsets.forEach((offset: [number, number], i: number) => {
        const [r, c] = offset;
        const cx = offsetX + (c - minC) * PREVIEW_CELL;
        const cy = offsetY + (maxR - r) * PREVIEW_CELL;
        const color = piece.colors[i];

        const alpha = idx === 0 ? 1 : 0.6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = TILE_COLORS[color];
        ctx.fillRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);

        ctx.strokeStyle = TILE_BORDER_COLORS[color];
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 1, cy + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);

        if (_showNumbers) {
          const fontSize = Math.floor(PREVIEW_CELL * 0.45);
          const tx = cx + PREVIEW_CELL / 2;
          const ty = cy + PREVIEW_CELL / 2;
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.7})`;
          ctx.lineWidth = 2;
          ctx.strokeText(String(color), tx, ty);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
          ctx.fillText(String(color), tx, ty);
        }
      });
    }
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

  if (isBombType(piece.type)) {
    const cx = (width - PREVIEW_CELL) / 2;
    const cy = (height - PREVIEW_CELL) / 2;
    drawBombAt(ctx, cx, cy, piece.type, PREVIEW_CELL, alpha);
  } else {
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

      if (_showNumbers) {
        const fontSize = Math.floor(PREVIEW_CELL * 0.45);
        const tx = cx + PREVIEW_CELL / 2;
        const ty = cy + PREVIEW_CELL / 2;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.strokeText(String(color), tx, ty);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
        ctx.fillText(String(color), tx, ty);
      }
    });
  }
  ctx.globalAlpha = 1;
}
