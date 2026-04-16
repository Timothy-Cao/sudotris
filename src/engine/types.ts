// Piece shape identifiers
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Rotation states (SRS standard): 0=spawn, 1=R(CW), 2=180, 3=L(CCW)
export type RotationState = 0 | 1 | 2 | 3;

// Color values 1-8
export type TileColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const NUM_COLORS = 8;

// A cell on the board
export type Cell = { color: TileColor } | null;

// Board dimensions
export const BOARD_WIDTH = 6;
export const BOARD_HEIGHT = 21; // 18 visible + 3 spawn
export const VISIBLE_HEIGHT = 18;
export const SPAWN_ROW = 18; // lowest spawn zone row

// A tile within a piece: offset from piece origin + assigned color
export interface PieceTile {
  row: number;
  col: number;
  color: TileColor;
}

// Active piece on the board
export interface ActivePiece {
  type: PieceType;
  tiles: PieceTile[];
  rotation: RotationState;
  row: number; // board row of piece origin
  col: number; // board col of piece origin
}

// The game board: row 0 = bottom, indexed [row][col]
export type Board = Cell[][];

// Input action identifiers
export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hardDrop'
  | 'softDrop';

// Key bindings: action -> KeyboardEvent.code string
export type KeyBindings = Record<InputAction, string>;

// DAS/ARR/SDF configuration
export interface HandlingConfig {
  das: number;  // ms, default 133
  arr: number;  // ms, 0 = instant
  sdf: number;  // multiplier, Infinity = instant
}

// Full settings (persisted to localStorage)
export interface Settings {
  keyBindings: KeyBindings;
  handling: HandlingConfig;
  showNumbers: boolean;
}

// Game phases
export type GamePhase = 'menu' | 'playing' | 'gameover';

// Score tracking
export interface ScoreState {
  score: number;
  linesCleared: number;
  combo: number;
  lastClearCount: number;
  tSpin: boolean;
}

// Lock delay state
export interface LockDelayState {
  active: boolean;
  timer: number;
  resets: number;
}

// Full game state (read by renderer)
export interface GameState {
  board: Board;
  lockedRowCount: number; // gray inert rows stacked at the bottom
  activePiece: ActivePiece | null;
  ghostRow: number | null;
  nextPieces: { type: PieceType; colors: TileColor[] }[];
  phase: GamePhase;
  score: ScoreState;
  timeRemaining: number;
  lockDelay: LockDelayState;
  softDropping: boolean;
}

// Default key bindings
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  rotateCW: 'ArrowUp',
  rotateCCW: 'ControlLeft',
  rotate180: 'KeyA',
  hardDrop: 'Space',
  softDrop: 'ArrowDown',
};

export const DEFAULT_HANDLING: HandlingConfig = {
  das: 133,
  arr: 10,
  sdf: 20,
};

export const DEFAULT_SETTINGS: Settings = {
  keyBindings: DEFAULT_KEY_BINDINGS,
  handling: DEFAULT_HANDLING,
  showNumbers: false,
};

// Game constants
export const GAME_DURATION = 5 * 60 * 1000;
export const GRAVITY_INTERVAL = 1000;
export const LOCK_DELAY = 500;
export const MAX_LOCK_RESETS = 15;
