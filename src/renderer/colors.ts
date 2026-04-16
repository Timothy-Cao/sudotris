import { TileColor } from '../engine/types';

export const TILE_COLORS: Record<TileColor, string> = {
  1: '#00F0F0', // Cyan
  2: '#F0F000', // Yellow
  3: '#A000F0', // Purple
  4: '#00F000', // Green
  5: '#F00000', // Red
  6: '#0000F0', // Blue
  7: '#F0A000', // Orange
  8: '#F000F0', // Magenta
};

// Slightly darker borders
export const TILE_BORDER_COLORS: Record<TileColor, string> = {
  1: '#00C0C0',
  2: '#C0C000',
  3: '#8000C0',
  4: '#00C000',
  5: '#C00000',
  6: '#0000C0',
  7: '#C08000',
  8: '#C000C0',
};

export const GHOST_ALPHA = 0.3;
export const LOCKED_OVERLAY = 'rgba(0, 0, 0, 0.45)';
export const LOCKED_STRIPE = 'rgba(255, 255, 255, 0.08)';

// Gray for locked/penalty rows that sink to bottom
export const LOCKED_ROW_COLOR = '#3a3a4e';
export const LOCKED_ROW_BORDER = '#2a2a3e';

export const BOARD_BG = '#0f0f23';
export const GRID_LINE = '#1a1a3e';
export const CELL_SIZE = 36;
