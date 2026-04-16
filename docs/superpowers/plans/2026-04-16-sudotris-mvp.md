# Sudotris MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable daily Sudoku-Tetris hybrid puzzle game as a Next.js web app with date-seeded RNG, 5-minute timer, and configurable controls.

**Architecture:** Pure TypeScript game engine (`engine/`) with zero DOM dependencies, rendered via HTML5 Canvas, wrapped in a thin Next.js App Router shell. All settings persisted in localStorage.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, HTML5 Canvas

**Spec:** `docs/superpowers/specs/2026-04-16-sudotris-design.md`

---

## File Structure

```
src/
  app/
    page.tsx                  # Game page — mounts GameCanvas, Timer, Score, NextPiece
    settings/page.tsx         # Settings page — keybinds, DAS/ARR/SDF sliders
    layout.tsx                # Root layout, dark theme, global font
    globals.css               # Tailwind imports + custom vars
  engine/
    types.ts                  # All type definitions (Board, Piece, GameState, Config, etc.)
    rng.ts                    # Mulberry32 seeded PRNG
    pieces.ts                 # 7 tetromino definitions + SRS kick tables
    board.ts                  # Board creation, collision detection, line clear/lock logic
    bag.ts                    # 7-bag randomizer with color assignment
    game.ts                   # Game state machine (spawn, tick, input, lock, game over)
    input.ts                  # DAS/ARR input processor
    scoring.ts                # Score + combo + multi-line tracking
  renderer/
    canvas.ts                 # Canvas draw functions (board, piece, ghost, locked rows, numbers)
    colors.ts                 # Color palette definition (6 colors + locked overlay)
  hooks/
    useGame.ts                # React hook: game loop, input binding, canvas ref
    useSettings.ts            # localStorage read/write for all settings
  components/
    GameCanvas.tsx            # Canvas element wrapper
    NextPiecePreview.tsx      # Next piece mini-canvas
    Timer.tsx                 # Countdown timer display
    ScoreDisplay.tsx          # Score + lines display
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/bytedance/Documents/Personal/Sudotris
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Accept defaults. This creates the full Next.js skeleton.

- [ ] **Step 2: Verify it runs**

```bash
npm run dev
```

Visit localhost:3000, confirm default page loads.

- [ ] **Step 3: Clean up default content**

Replace `src/app/page.tsx` with a minimal placeholder:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold">Sudotris</h1>
    </main>
  );
}
```

Update `src/app/globals.css` to just Tailwind directives + dark body bg.

Update `src/app/layout.tsx` with title "Sudotris" and dark theme meta.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind"
```

---

### Task 2: Engine Types

**Files:**
- Create: `src/engine/types.ts`

- [ ] **Step 1: Define all core types**

```typescript
// Piece shape identifiers
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Rotation states (SRS standard)
export type RotationState = 0 | 1 | 2 | 3; // 0=spawn, 1=R(CW), 2=180, 3=L(CCW)

// Color values 1-6 (also the displayed number)
export type TileColor = 1 | 2 | 3 | 4 | 5 | 6;

// A cell on the board
export type Cell = { color: TileColor } | null;

// Board dimensions
export const BOARD_WIDTH = 6;
export const BOARD_HEIGHT = 21; // 18 visible + 3 spawn
export const VISIBLE_HEIGHT = 18;
export const SPAWN_ROW = 18; // lowest spawn zone row

// A tile within a piece: offset from piece origin + assigned color
export interface PieceTile {
  row: number; // offset within bounding box
  col: number;
  color: TileColor;
}

// Active piece on the board
export interface ActivePiece {
  type: PieceType;
  tiles: PieceTile[]; // 4 tiles with colors, relative to origin
  rotation: RotationState;
  row: number; // board row of piece origin (bottom-left of bounding box)
  col: number; // board col of piece origin
}

// The game board: row 0 = bottom
export type Board = Cell[][];  // [row][col], BOARD_HEIGHT x BOARD_WIDTH

// Input action identifiers
export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hardDrop'
  | 'softDrop';

// Key bindings: action -> key code string
export type KeyBindings = Record<InputAction, string>;

// DAS/ARR/SDF configuration
export interface HandlingConfig {
  das: number;     // ms, default 133
  arr: number;     // ms, 0 = instant
  sdf: number;     // multiplier, Infinity = instant
}

// Full settings (persisted to localStorage)
export interface Settings {
  keyBindings: KeyBindings;
  handling: HandlingConfig;
}

// Game phases
export type GamePhase = 'menu' | 'playing' | 'gameover';

// Score tracking (infra for future multipliers)
export interface ScoreState {
  score: number;
  linesCleared: number;
  combo: number;          // resets to 0 on lock with no clears
  lastClearCount: number; // lines cleared on last lock (0/1/2/3/4)
  tSpin: boolean;         // stub: always false for MVP
}

// Full game state
export interface GameState {
  board: Board;
  lockedRows: Set<number>;
  activePiece: ActivePiece | null;
  nextPiece: { type: PieceType; colors: TileColor[] } | null;
  phase: GamePhase;
  score: ScoreState;
  timeRemaining: number; // ms
  lockDelay: { active: boolean; timer: number; resets: number };
  softDropping: boolean;
}

// Default settings
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  rotateCW: 'ArrowUp',
  rotateCCW: 'Control',
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
};

// Game constants
export const GAME_DURATION = 5 * 60 * 1000; // 5 minutes in ms
export const GRAVITY_INTERVAL = 1000;        // 1 row per second
export const LOCK_DELAY = 500;               // 0.5 seconds
export const MAX_LOCK_RESETS = 15;
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat(engine): add core type definitions"
```

---

### Task 3: Seeded RNG

**Files:**
- Create: `src/engine/rng.ts`

- [ ] **Step 1: Implement mulberry32 PRNG**

```typescript
// Mulberry32: fast 32-bit seeded PRNG
export function createRng(seed: number) {
  let state = seed | 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Shuffle array in place (Fisher-Yates)
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Sample n unique items from array
  function sampleWithout<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    shuffle(copy);
    return copy.slice(0, n);
  }

  return { next, shuffle, sampleWithout };
}

// Convert date string "YYYY-MM-DD" to a numeric seed
export function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return hash;
}

export type Rng = ReturnType<typeof createRng>;
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/rng.ts
git commit -m "feat(engine): add seeded PRNG (mulberry32)"
```

---

### Task 4: Piece Definitions + SRS Kick Tables

**Files:**
- Create: `src/engine/pieces.ts`

- [ ] **Step 1: Define piece shapes and SRS data**

Define all 7 tetrominoes with their 4 rotation states as tile offset arrays (row, col relative to origin). Origin is the rotation center.

Include the full SRS kick table:
- `JLSZT_KICKS`: standard kick data for J/L/S/Z/T
- `I_KICKS`: separate I-piece kick data
- Each entry: `[fromState][toState] -> [dx, dy][]` (up to 4 kick tests)

Piece shapes use the standard Tetris guideline positions in a 4x4 (I) or 3x3 (others) bounding box. O piece has single rotation state.

Export:
- `PIECE_SHAPES: Record<PieceType, [row, col][][]>` — indexed by rotation state
- `getKicks(type: PieceType, from: RotationState, to: RotationState): [number, number][]`
- `PIECE_SPAWN_OFFSETS: Record<PieceType, { row: number; col: number }>` — spawn position on 6-wide board

- [ ] **Step 2: Commit**

```bash
git add src/engine/pieces.ts
git commit -m "feat(engine): add piece definitions and SRS kick tables"
```

---

### Task 5: Board Logic

**Files:**
- Create: `src/engine/board.ts`

- [ ] **Step 1: Implement board operations**

```typescript
export function createBoard(): Board
// Returns BOARD_HEIGHT x BOARD_WIDTH grid of null cells

export function isValidPosition(board: Board, tiles: { row: number; col: number }[], pieceRow: number, pieceCol: number): boolean
// Check if all tiles at (pieceRow + tile.row, pieceCol + tile.col) are in bounds and unoccupied

export function lockPiece(board: Board, piece: ActivePiece): Board
// Place piece tiles onto board, return new board

export function evaluateLines(board: Board, lockedRows: Set<number>): {
  board: Board;
  lockedRows: Set<number>;
  linesCleared: number;
}
// 1. Scan all rows, mark full rows as "clear" (6 unique colors) or "penalty" (dupes)
// 2. Remove clear rows, shift everything down
// 3. Mark penalty rows (post-shift) as locked
// Return updated board, locked rows, and clear count

export function getGhostRow(board: Board, piece: ActivePiece): number
// Drop piece straight down, return the lowest valid row
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/board.ts
git commit -m "feat(engine): add board logic (collision, lock, line clear)"
```

---

### Task 6: Bag Randomizer

**Files:**
- Create: `src/engine/bag.ts`

- [ ] **Step 1: Implement 7-bag with color assignment**

```typescript
import { Rng } from './rng';
import { PieceType, TileColor } from './types';

export function createBag(rng: Rng) {
  let queue: PieceType[] = [];

  function refill() {
    const bag: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    rng.shuffle(bag);
    queue.push(...bag);
  }

  // Maintain a lookahead buffer of pre-generated pieces (type + colors)
  const buffer: { type: PieceType; colors: TileColor[] }[] = [];

  function generatePiece(): { type: PieceType; colors: TileColor[] } {
    if (queue.length === 0) refill();
    const type = queue.shift()!;
    const allColors: TileColor[] = [1, 2, 3, 4, 5, 6];
    const colors = rng.sampleWithout(allColors, 4);
    // colors[0..3] map to piece tiles in row-major order
    // (top-to-bottom, left-to-right within bounding box, skipping empty cells)
    return { type, colors };
  }

  function ensureBuffer() {
    while (buffer.length < 2) buffer.push(generatePiece());
  }

  function next(): { type: PieceType; colors: TileColor[] } {
    ensureBuffer();
    const piece = buffer.shift()!;
    ensureBuffer(); // always keep at least 1 for preview
    return piece;
  }

  function peek(): { type: PieceType; colors: TileColor[] } {
    ensureBuffer();
    return buffer[0];
  }

  return { next, peek };
}

- [ ] **Step 2: Commit**

```bash
git add src/engine/bag.ts
git commit -m "feat(engine): add 7-bag randomizer with color assignment"
```

---

### Task 7: Scoring

**Files:**
- Create: `src/engine/scoring.ts`

- [ ] **Step 1: Implement score tracking**

```typescript
import { ScoreState } from './types';

export function createScoreState(): ScoreState {
  return { score: 0, linesCleared: 0, combo: 0, lastClearCount: 0, tSpin: false };
}

export function updateScore(state: ScoreState, linesClearedThisLock: number): ScoreState {
  const newCombo = linesClearedThisLock > 0 ? state.combo + 1 : 0;
  return {
    score: state.score + linesClearedThisLock, // 1 point per line for MVP
    linesCleared: state.linesCleared + linesClearedThisLock,
    combo: newCombo,
    lastClearCount: linesClearedThisLock,
    tSpin: false, // stub
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/scoring.ts
git commit -m "feat(engine): add score tracking with combo infrastructure"
```

---

### Task 8: Input Processor (DAS/ARR)

**Files:**
- Create: `src/engine/input.ts`

- [ ] **Step 1: Implement DAS/ARR input handler**

The input processor tracks key states and produces movement actions based on DAS/ARR timing:

```typescript
export function createInputProcessor(handling: HandlingConfig) {
  // Track per-key state: { pressed: boolean, holdTime: number, dasCharged: boolean }
  // On keydown: mark pressed, reset holdTime
  // On keyup: mark released
  // update(dt): for held horizontal keys, accumulate holdTime.
  //   if holdTime >= das and !dasCharged: fire one move, mark dasCharged
  //   if dasCharged and arr === 0: teleport to wall
  //   if dasCharged and arr > 0: fire move every arr ms
  // Returns list of actions to execute this frame

  return { keyDown, keyUp, update, getActions };
}
```

Handle left/right DAS/ARR. Soft drop uses SDF multiplier on gravity. Rotation and hard drop are instant (fire on keydown only, no repeat).

- [ ] **Step 2: Commit**

```bash
git add src/engine/input.ts
git commit -m "feat(engine): add DAS/ARR input processor"
```

---

### Task 9: Game State Machine

**Files:**
- Create: `src/engine/game.ts`

- [ ] **Step 1: Implement the core game loop**

This is the main orchestrator. It manages:

```typescript
export function createGame(seed: string) {
  // Initialize: RNG from seed, bag, empty board, score state
  // State machine: menu -> playing -> gameover

  function start(): void
  // Transition to playing, spawn first piece, start timer

  function tick(dt: number): void
  // Called every frame with delta time in ms
  // 1. Update timer (timeRemaining -= dt). If <= 0: lock piece, eval lines, gameover
  // 2. Process gravity: accumulate gravity timer. When it fires, move piece down 1
  //    If can't move down: start/continue lock delay
  // 3. Lock delay: if active, accumulate. If expired or max resets: lock piece
  // 4. After lock: check lock-out (any locked tile in rows 18-20 → gameover)
  //    Then evaluateLines, updateScore, spawn next piece
  //    If spawn overlaps (blockout): gameover

  function handleAction(action: InputAction): void
  // moveLeft/moveRight: try move, if success reset lock delay (if active) up to max resets
  // rotateCW/CCW/180: try SRS rotation with kicks, reset lock delay if success
  // hardDrop: drop to ghost position, lock immediately (no lock delay)
  // softDrop: set softDropping flag (gravity uses SDF multiplier)

  function getState(): GameState
  // Return current state snapshot for rendering

  return { start, tick, handleAction, getState };
}
```

Key behaviors:
- Gravity timer: accumulates dt. When >= interval (1000ms, or 1000/sdf during soft drop), move down.
- Lock delay: starts when piece can't move down. 500ms timer, resets on move/rotate (max 15).
- Piece spawn: place at SPAWN_ROW, centered. Check blockout immediately.
- Hard drop: teleport to ghost row, lock immediately, skip lock delay.

- [ ] **Step 2: Commit**

```bash
git add src/engine/game.ts
git commit -m "feat(engine): add game state machine and loop"
```

---

### Task 10: Color Palette

**Files:**
- Create: `src/renderer/colors.ts`

- [ ] **Step 1: Define color palette**

```typescript
import { TileColor } from '../engine/types';

// 6 distinct saturated colors
export const TILE_COLORS: Record<TileColor, string> = {
  1: '#FF4444', // Red
  2: '#44AAFF', // Blue
  3: '#44DD44', // Green
  4: '#FFAA00', // Orange
  5: '#AA44FF', // Purple
  6: '#FFDD44', // Yellow
};

// Ghost piece: same hues, lower opacity
export const GHOST_ALPHA = 0.3;

// Locked row overlay
export const LOCKED_OVERLAY = 'rgba(0, 0, 0, 0.5)';

// Board colors
export const BOARD_BG = '#1a1a2e';
export const GRID_LINE = '#2a2a4e';
export const CELL_SIZE = 36; // pixels per cell
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/colors.ts
git commit -m "feat(renderer): add color palette definitions"
```

---

### Task 11: Canvas Renderer

**Files:**
- Create: `src/renderer/canvas.ts`

- [ ] **Step 1: Implement all drawing functions**

```typescript
export function drawBoard(ctx: CanvasRenderingContext2D, state: GameState): void
// Clear canvas
// Draw background grid (6x18 visible cells)
// Draw placed tiles (board cells) with color fill + number overlay
// Draw locked row overlay (dimmed hatching)
// Draw ghost piece (semi-transparent, at ghost row)
// Draw active piece (solid colors + numbers)

export function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, color: TileColor, alpha?: number): void
// Fill cell with TILE_COLORS[color] at given alpha
// Draw number (1-6) centered in cell
// Draw subtle border/bevel for 3D effect

export function drawNextPiece(ctx: CanvasRenderingContext2D, piece: { type: PieceType; colors: TileColor[] } | null): void
// Draw the next piece preview in a small canvas area
```

Canvas coordinate mapping: row 0 (bottom of board) maps to bottom of canvas. Row 17 (top visible) maps to top. Each cell is CELL_SIZE x CELL_SIZE pixels.

Canvas dimensions: `BOARD_WIDTH * CELL_SIZE` x `VISIBLE_HEIGHT * CELL_SIZE` = 216 x 648 pixels.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/canvas.ts
git commit -m "feat(renderer): add canvas drawing functions"
```

---

### Task 12: Settings Hook

**Files:**
- Create: `src/hooks/useSettings.ts`

- [ ] **Step 1: Implement localStorage-backed settings**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../engine/types';

const STORAGE_KEY = 'sudotris-settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); }
      catch { /* use defaults */ }
    }
  }, []);

  function updateSettings(partial: Partial<Settings>) {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { settings, updateSettings };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSettings.ts
git commit -m "feat(hooks): add settings hook with localStorage persistence"
```

---

### Task 13: Game Hook (Bridge)

**Files:**
- Create: `src/hooks/useGame.ts`

- [ ] **Step 1: Implement the React-engine bridge**

```typescript
'use client';
import { useRef, useEffect, useCallback } from 'react';
import { createGame } from '../engine/game';
import { drawBoard } from '../renderer/canvas';
import { Settings, InputAction } from '../engine/types';

export function useGame(canvasRef: React.RefObject<HTMLCanvasElement>, settings: Settings) {
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  const animFrameRef = useRef<number>(0);

  // Initialize game with today's date seed
  // Set up requestAnimationFrame loop:
  //   1. Calculate dt from last frame
  //   2. game.tick(dt)
  //   3. drawBoard(ctx, game.getState())
  //   4. Request next frame
  //
  // Set up keyboard listeners:
  //   keydown -> map key code via settings.keyBindings -> game.handleAction()
  //   Also feed into DAS/ARR input processor
  //   keyup -> release in input processor
  //
  // Cleanup on unmount: cancel animation frame, remove listeners

  return {
    start: () => gameRef.current?.start(),
    getState: () => gameRef.current?.getState(),
  };
}
```

The game loop runs at 60fps via requestAnimationFrame. Input events are processed synchronously (keydown fires action immediately for rotations/hard drop, DAS/ARR handled in tick for horizontal movement).

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGame.ts
git commit -m "feat(hooks): add game hook bridging engine to canvas"
```

---

### Task 14: React Components

**Files:**
- Create: `src/components/GameCanvas.tsx`, `src/components/NextPiecePreview.tsx`, `src/components/Timer.tsx`, `src/components/ScoreDisplay.tsx`

- [ ] **Step 1: Build GameCanvas**

Renders a `<canvas>` element at the correct dimensions. Exposes ref to parent.

- [ ] **Step 2: Build Timer**

Displays `mm:ss` countdown from `timeRemaining` in game state. Red when under 30s.

- [ ] **Step 3: Build ScoreDisplay**

Shows current score and total lines cleared.

- [ ] **Step 4: Build NextPiecePreview**

Small canvas or div showing the next piece with its colors.

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat(components): add game UI components"
```

---

### Task 15: Game Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Assemble the game page**

```tsx
// Layout: centered column
// - Title + date
// - Row: [NextPiece] [Canvas] [Score + Timer]
// - Menu overlay: play button + personal best score (from localStorage)
// - Game Over overlay: final score, lines cleared, new best indicator
// - Settings link at bottom
//
// Uses useGame hook + useSettings hook
// Menu state: show play button overlay on canvas
// Playing state: game running
// Game over: show score overlay with "back to menu" button
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble game page with all components"
```

---

### Task 16: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Build settings UI**

Two sections:

**Key Bindings:**
- List each action with current key displayed
- Click to rebind: listen for next keypress, save it
- Reset to defaults button

**Handling:**
- DAS slider: 0-300ms, step 1, default 133
- ARR slider: 0-100ms, step 1, default 10 (label "0 = instant")
- SDF slider: 1-40x + infinity option, default 20

Back link to game page.

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add settings page with keybinds and handling config"
```

---

### Task 17: Integration & Polish

- [ ] **Step 1: Wire everything together**

Run the dev server, verify:
- Game starts on play button click
- Pieces spawn and fall
- Left/right/rotate controls work
- Ghost piece renders correctly
- Lines clear on unique colors
- Locked rows appear on non-unique fills
- Timer counts down and ends game
- Score increments on line clears
- Next piece preview updates
- Settings page saves and applies

- [ ] **Step 2: Fix any integration bugs**

- [ ] **Step 3: Save high score to localStorage**

On game over, compare score to stored best. Update if higher. Show on menu screen.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete MVP integration and polish"
```

---

### Task 18: GitHub + Vercel Prep

- [ ] **Step 1: Add .gitignore entries if missing**

Ensure `node_modules/`, `.next/`, `.env*` are ignored.

- [ ] **Step 2: Final commit and verify build**

```bash
npm run build
```

Fix any build errors.

- [ ] **Step 3: Commit build fixes if any**

- [ ] **Step 4: Notify user — ready for GitHub push + Vercel connection**
