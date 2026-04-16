import { TileColor } from '../engine/types';

export const TILE_COLORS: Record<TileColor, string> = {
  1: '#FF3366', // Hot Pink / Red
  2: '#33CCFF', // Electric Blue
  3: '#FFCC00', // Bright Yellow
  4: '#33FF66', // Neon Green
};

export const TILE_BORDER_COLORS: Record<TileColor, string> = {
  1: '#CC2244',
  2: '#2299CC',
  3: '#CC9900',
  4: '#22CC44',
};

export const GHOST_ALPHA = 0.3;
export const LOCKED_OVERLAY = 'rgba(0, 0, 0, 0.45)';
export const LOCKED_STRIPE = 'rgba(255, 255, 255, 0.08)';

export const LOCKED_ROW_COLOR = '#3a3a4e';
export const LOCKED_ROW_BORDER = '#2a2a3e';

export const BOARD_BG = '#0f0f23';
export const GRID_LINE = '#1a1a3e';
export let CELL_SIZE = 36;
export function setCellSize(size: number) { CELL_SIZE = size; }
