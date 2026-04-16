import { TileColor } from '../engine/types';

export const TILE_COLORS: Record<TileColor, string> = {
  1: '#FF4444', // Red
  2: '#44AAFF', // Blue
  3: '#44DD44', // Green
  4: '#FFAA00', // Orange
  5: '#AA44FF', // Purple
  6: '#FFDD44', // Yellow
};

export const TILE_BORDER_COLORS: Record<TileColor, string> = {
  1: '#CC2222',
  2: '#2288DD',
  3: '#22AA22',
  4: '#DD8800',
  5: '#8822DD',
  6: '#DDBB22',
};

export const GHOST_ALPHA = 0.3;
export const LOCKED_OVERLAY = 'rgba(0, 0, 0, 0.45)';
export const LOCKED_STRIPE = 'rgba(255, 255, 255, 0.08)';

export const BOARD_BG = '#0f0f23';
export const GRID_LINE = '#1a1a3e';
export const CELL_SIZE = 36;
