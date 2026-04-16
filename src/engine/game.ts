import {
  GameState,
  ActivePiece,
  PieceTile,
  InputAction,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
  GAME_DURATION,
  LOCK_DELAY,
  MAX_LOCK_RESETS,
  TileColor,
  PieceType,
  RotationState,
  Settings,
} from './types';
import { createRng } from './rng';
import { createBoard, isValidPosition, lockPiece, evaluateSudokuClears, getGhostRow } from './board';
import { createBag } from './bag';
import { PIECE_SHAPES, getKicks, getSpawnCol, getSpawnRow } from './pieces';
import { createScoreState, updateScore } from './scoring';
import { createInputProcessor } from './input';

export type GameEvent =
  | { type: 'sudokuClear'; cells: { row: number; col: number }[] };

export type GameEventHandler = (event: GameEvent) => void;

export function createGame(settings: Settings, onEvent?: GameEventHandler) {
  const seed = Math.floor(Math.random() * 2147483647);
  const rng = createRng(seed);
  const bag = createBag(rng);
  const inputProcessor = createInputProcessor(settings.handling);

  let state: GameState = {
    board: createBoard(),
    lockedRowCount: 0,
    activePiece: null,
    ghostRow: null,
    nextPieces: [],
    holdPiece: null,
    canHold: true,
    phase: 'menu',
    score: createScoreState(),
    timeRemaining: GAME_DURATION,
    lockDelay: { active: false, timer: 0, resets: 0 },
    softDropping: false,
  };

  let lastActionWasRotation = false;

  function spawnPiece(): boolean {
    const bagPiece = bag.next();
    const { type, colors } = bagPiece;
    const spawnRow = getSpawnRow(type);
    const spawnCol = getSpawnCol(type);

    const shapeOffsets = PIECE_SHAPES[type][0];
    const tiles: PieceTile[] = shapeOffsets.map((offset, i) => ({
      row: offset[0],
      col: offset[1],
      color: colors[i],
    }));

    const tileOffsets = tiles.map(t => [t.row, t.col] as [number, number]);
    if (!isValidPosition(state.board, tileOffsets, spawnRow, spawnCol)) {
      return false;
    }

    state.activePiece = {
      type, tiles, rotation: 0, row: spawnRow, col: spawnCol,
    };
    state.nextPieces = bag.peekN(3).map(p => ({ type: p.type, colors: [...p.colors] }));
    state.ghostRow = getGhostRow(state.board, state.activePiece);
    state.lockDelay = { active: false, timer: 0, resets: 0 };
    return true;
  }

  function holdCurrentPiece(): void {
    if (!state.activePiece || !state.canHold) return;
    const current = state.activePiece;
    const currentColors = current.tiles.map(t => t.color);

    if (state.holdPiece) {
      const held = state.holdPiece;
      state.holdPiece = { type: current.type, colors: currentColors };

      const spawnRow = getSpawnRow(held.type);
      const spawnCol = getSpawnCol(held.type);
      const shapeOffsets = PIECE_SHAPES[held.type][0];
      const tiles: PieceTile[] = shapeOffsets.map((offset, i) => ({
        row: offset[0], col: offset[1], color: held.colors[i],
      }));
      const tileOffsets = tiles.map(t => [t.row, t.col] as [number, number]);
      if (!isValidPosition(state.board, tileOffsets, spawnRow, spawnCol)) {
        state.phase = 'gameover';
        return;
      }
      state.activePiece = { type: held.type, tiles, rotation: 0, row: spawnRow, col: spawnCol };
      state.ghostRow = getGhostRow(state.board, state.activePiece);
    } else {
      state.holdPiece = { type: current.type, colors: currentColors };
      state.activePiece = null;
      if (!spawnPiece()) { state.phase = 'gameover'; return; }
    }
    state.canHold = false;
    state.lockDelay = { active: false, timer: 0, resets: 0 };
    lastActionWasRotation = false;
  }

  function start(): void {
    const freshRng = createRng(seed);
    const freshBag = createBag(freshRng);
    Object.assign(bag, freshBag);
    inputProcessor.reset();

    state = {
      board: createBoard(),
      lockedRowCount: 0,
      activePiece: null,
      ghostRow: null,
      nextPieces: [],
      holdPiece: null,
      canHold: true,
      phase: 'playing',
      score: createScoreState(),
      timeRemaining: GAME_DURATION,
      lockDelay: { active: false, timer: 0, resets: 0 },
      softDropping: false,
    };

    if (!spawnPiece()) { state.phase = 'gameover'; }
  }

  function tryMove(dr: number, dc: number): boolean {
    if (!state.activePiece) return false;
    const offsets = state.activePiece.tiles.map(t => [t.row, t.col] as [number, number]);
    const newRow = state.activePiece.row + dr;
    const newCol = state.activePiece.col + dc;
    if (isValidPosition(state.board, offsets, newRow, newCol)) {
      state.activePiece.row = newRow;
      state.activePiece.col = newCol;
      state.ghostRow = getGhostRow(state.board, state.activePiece);
      return true;
    }
    return false;
  }

  // Rotate colors by placing them on a grid, geometrically rotating,
  // then mapping back to the new SRS positions.
  function computeRotatedColors(
    tiles: PieceTile[],
    newOffsets: [number, number][],
    direction: 'cw' | 'ccw' | '180',
    type: PieceType
  ): TileColor[] {
    const S = type === 'I' ? 4 : type === 'O' ? 2 : 3;

    // Place colors on a local grid
    const grid = new Map<string, TileColor>();
    for (const t of tiles) grid.set(`${t.row},${t.col}`, t.color);

    // Rotate each position geometrically
    // CW (y-up): (r,c) → (S-1-c, r)
    // CCW: (r,c) → (c, S-1-r)
    // 180: (r,c) → (S-1-r, S-1-c)
    const rotated: { r: number; c: number; color: TileColor }[] = [];
    for (const [key, color] of grid) {
      const [r, c] = key.split(',').map(Number);
      let nr: number, nc: number;
      if (direction === 'cw') { nr = S - 1 - c; nc = r; }
      else if (direction === 'ccw') { nr = c; nc = S - 1 - r; }
      else { nr = S - 1 - r; nc = S - 1 - c; }
      rotated.push({ r: nr, c: nc, color });
    }

    // Find the integer offset that best aligns rotated positions to SRS positions
    let bestDr = 0, bestDc = 0, bestMatches = -1;
    const tried = new Set<string>();
    for (const rp of rotated) {
      for (const [sr, sc] of newOffsets) {
        const dr = sr - rp.r, dc = sc - rp.c;
        const key = `${dr},${dc}`;
        if (tried.has(key)) continue;
        tried.add(key);
        let matches = 0;
        for (const rp2 of rotated) {
          if (newOffsets.some(([r, c]) => r === rp2.r + dr && c === rp2.c + dc)) matches++;
        }
        if (matches > bestMatches) { bestMatches = matches; bestDr = dr; bestDc = dc; }
      }
    }

    // Build shifted rotated map
    const shifted = new Map<string, TileColor>();
    const usedKeys = new Set<string>();
    for (const rp of rotated) shifted.set(`${rp.r + bestDr},${rp.c + bestDc}`, rp.color);

    // Assign: exact matches first, then nearest for remaining
    const result: (TileColor | null)[] = newOffsets.map(() => null);
    const usedRotated = new Set<number>();

    // Pass 1: exact matches
    for (let i = 0; i < newOffsets.length; i++) {
      const key = `${newOffsets[i][0]},${newOffsets[i][1]}`;
      if (shifted.has(key)) {
        result[i] = shifted.get(key)!;
        usedKeys.add(key);
        // Mark which rotated entry was used
        const ri = rotated.findIndex(rp => `${rp.r + bestDr},${rp.c + bestDc}` === key && !usedRotated.has(rotated.indexOf(rp)));
        if (ri >= 0) usedRotated.add(ri);
      }
    }

    // Pass 2: unmatched → nearest unused rotated
    for (let i = 0; i < result.length; i++) {
      if (result[i] !== null) continue;
      const [tr, tc] = newOffsets[i];
      let bestIdx = -1, bestDist = Infinity;
      for (let j = 0; j < rotated.length; j++) {
        if (usedRotated.has(j)) continue;
        const dist = Math.abs(tr - (rotated[j].r + bestDr)) + Math.abs(tc - (rotated[j].c + bestDc));
        if (dist < bestDist) { bestDist = dist; bestIdx = j; }
      }
      if (bestIdx >= 0) {
        result[i] = rotated[bestIdx].color;
        usedRotated.add(bestIdx);
      } else {
        result[i] = tiles[0].color; // fallback
      }
    }

    return result as TileColor[];
  }

  function tryRotate(direction: 'cw' | 'ccw' | '180'): boolean {
    if (!state.activePiece) return false;
    const piece = state.activePiece;
    const from = piece.rotation;
    let to: RotationState;
    if (direction === 'cw') to = ((from + 1) % 4) as RotationState;
    else if (direction === 'ccw') to = ((from + 3) % 4) as RotationState;
    else to = ((from + 2) % 4) as RotationState;

    const newShapeOffsets = PIECE_SHAPES[piece.type][to];
    const kicks = getKicks(piece.type, from, to);

    for (const [dx, dy] of kicks) {
      const newCol = piece.col + dx;
      const newRow = piece.row + dy;
      if (isValidPosition(state.board, newShapeOffsets, newRow, newCol)) {
        const newColors = computeRotatedColors(piece.tiles, newShapeOffsets, direction, piece.type);

        piece.tiles = newShapeOffsets.map((offset, i) => ({
          row: offset[0], col: offset[1],
          color: newColors[i],
        }));
        piece.rotation = to;
        piece.row = newRow;
        piece.col = newCol;
        state.ghostRow = getGhostRow(state.board, piece);
        return true;
      }
    }
    return false;
  }

  function canMoveDown(): boolean {
    if (!state.activePiece) return false;
    const offsets = state.activePiece.tiles.map(t => [t.row, t.col] as [number, number]);
    return isValidPosition(state.board, offsets, state.activePiece.row - 1, state.activePiece.col);
  }

  function lockCurrentPiece(): void {
    if (!state.activePiece) return;
    const piece = state.activePiece;

    // Lock onto board
    state.board = lockPiece(state.board, piece);

    // Check lock-out
    for (const tile of piece.tiles) {
      const r = piece.row + tile.row;
      if (r >= VISIBLE_HEIGHT) {
        state.phase = 'gameover';
        state.activePiece = null;
        return;
      }
    }

    // Evaluate sudoku clears around newly placed tiles
    const newPositions = piece.tiles.map(t => ({
      row: piece.row + t.row,
      col: piece.col + t.col,
    }));
    const result = evaluateSudokuClears(state.board, newPositions);
    state.board = result.board;

    if (result.clearedCells.length > 0) {
      onEvent?.({ type: 'sudokuClear', cells: result.clearedCells });
    }

    state.score = updateScore(state.score, result.clears);

    // Full clear bonus: board is completely empty
    const isBoardEmpty = state.board.every(row => row.every(cell => cell === null));
    if (isBoardEmpty && result.clears > 0) {
      state.score = { ...state.score, score: state.score.score + 50000 };
    }

    state.activePiece = null;
    state.canHold = true;

    if (!spawnPiece()) { state.phase = 'gameover'; }
  }

  function handleAction(action: InputAction): void {
    if (state.phase !== 'playing' || !state.activePiece) return;
    let moved = false;

    switch (action) {
      case 'moveLeft':
        moved = tryMove(0, -1);
        if (moved) lastActionWasRotation = false;
        break;
      case 'moveRight':
        moved = tryMove(0, 1);
        if (moved) lastActionWasRotation = false;
        break;
      case 'rotateCW':
        moved = tryRotate('cw');
        if (moved) lastActionWasRotation = true;
        break;
      case 'rotateCCW':
        moved = tryRotate('ccw');
        if (moved) lastActionWasRotation = true;
        break;
      case 'rotate180':
        moved = tryRotate('180');
        if (moved) lastActionWasRotation = true;
        break;
      case 'hardDrop':
        if (state.activePiece && state.ghostRow !== null) {
          state.activePiece.row = state.ghostRow;
          lockCurrentPiece();
        }
        return;
      case 'softDrop':
        // With 0 gravity, soft drop moves piece down one row
        if (canMoveDown()) tryMove(-1, 0);
        return;
      case 'hold':
        holdCurrentPiece();
        return;
    }

    // Reset lock delay on successful move/rotate
    if (moved && state.lockDelay.active && state.lockDelay.resets < MAX_LOCK_RESETS) {
      state.lockDelay.timer = 0;
      state.lockDelay.resets++;
    }
  }

  function tick(dt: number): void {
    if (state.phase !== 'playing') return;

    // Timer
    state.timeRemaining -= dt;
    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      if (state.activePiece) lockCurrentPiece();
      state.phase = 'gameover';
      return;
    }

    if (!state.activePiece) return;

    // Process DAS/ARR input
    inputProcessor.update(dt);
    const actions = inputProcessor.getActions();
    for (const action of actions) {
      handleAction(action);
      if (state.phase !== 'playing') return;
    }

    // No gravity — pieces only move via input
    // But still handle lock delay when piece is resting on surface
    if (!canMoveDown()) {
      if (!state.lockDelay.active) {
        state.lockDelay.active = true;
        state.lockDelay.timer = 0;
      }
    } else if (state.lockDelay.active) {
      state.lockDelay.active = false;
      state.lockDelay.timer = 0;
    }

    if (state.lockDelay.active && state.activePiece) {
      state.lockDelay.timer += dt;
      if (state.lockDelay.timer >= LOCK_DELAY || state.lockDelay.resets >= MAX_LOCK_RESETS) {
        lockCurrentPiece();
      }
    }
  }

  function inputKeyDown(action: InputAction): void {
    if (state.phase !== 'playing') return;
    if (action === 'rotateCW' || action === 'rotateCCW' || action === 'rotate180' || action === 'hardDrop' || action === 'hold') {
      handleAction(action);
    } else {
      inputProcessor.keyDown(action);
    }
  }

  function inputKeyUp(action: InputAction): void {
    inputProcessor.keyUp(action);
  }

  function getState(): GameState {
    return {
      ...state,
      board: state.board.map(row => [...row]),
      activePiece: state.activePiece ? { ...state.activePiece, tiles: [...state.activePiece.tiles] } : null,
      score: { ...state.score },
      lockDelay: { ...state.lockDelay },
      nextPieces: state.nextPieces.map(p => ({ ...p, colors: [...p.colors] })),
      holdPiece: state.holdPiece ? { ...state.holdPiece, colors: [...state.holdPiece.colors] } : null,
    };
  }

  function updateSettings(newSettings: Settings): void {
    inputProcessor.updateHandling(newSettings.handling);
  }

  return { start, tick, inputKeyDown, inputKeyUp, getState, updateSettings };
}

export type Game = ReturnType<typeof createGame>;
