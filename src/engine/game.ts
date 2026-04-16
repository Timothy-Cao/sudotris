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
        const oldColors = piece.tiles.map(t => t.color);
        const n = piece.tiles.length;

        // O, S, Z have identical shapes in some rotation states,
        // so we must cycle colors to make rotation visible.
        // I, T, J, L have unique shapes per state — index tracks physical tile.
        const needsCycle = piece.type === 'O' || piece.type === 'S' || piece.type === 'Z';

        let newColors: TileColor[];
        if (!needsCycle) {
          newColors = oldColors; // identity
        } else if (direction === '180') {
          // Reverse: top-left↔bottom-right, top-right↔bottom-left
          newColors = [...oldColors].reverse();
        } else {
          // CW: shift 1, CCW: shift 3
          const shift = direction === 'cw' ? 1 : 3;
          newColors = oldColors.map((_, i) => oldColors[(i + shift) % n]);
        }

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
