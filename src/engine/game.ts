import {
  GameState,
  GamePhase,
  ActivePiece,
  PieceTile,
  InputAction,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  VISIBLE_HEIGHT,
  SPAWN_ROW,
  GAME_DURATION,
  GRAVITY_INTERVAL,
  LOCK_DELAY,
  MAX_LOCK_RESETS,
  TileColor,
  RotationState,
  Settings,
} from './types';
import { createRng, dateSeed, Rng } from './rng';
import { createBoard, isValidPosition, lockPiece, evaluateLines, explodeBomb, getGhostRow } from './board';
import { isBombType } from './pieces';
import { createBag, Bag } from './bag';
import { PIECE_SHAPES, getKicks, getSpawnCol, getSpawnRow } from './pieces';
import { createScoreState, updateScore } from './scoring';
import { createInputProcessor, InputProcessor } from './input';

export function createGame(dateStr: string, settings: Settings) {
  const seed = dateSeed(dateStr);
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

  let gravityAccumulator = 0;
  let lastActionWasRotation = false;

  function spawnPiece(): boolean {
    const bagPiece = bag.next();
    const { type, colors } = bagPiece;
    const spawnRow = getSpawnRow(type);
    const spawnCol = getSpawnCol(type);

    // Assign colors to tiles by their index in PIECE_SHAPES.
    const shapeOffsets = PIECE_SHAPES[type][0];
    const tiles: PieceTile[] = shapeOffsets.map((offset, i) => ({
      row: offset[0],
      col: offset[1],
      color: colors[i] || (0 as TileColor), // bombs use 0 (rendered specially)
    }));

    const tileOffsets = tiles.map(t => [t.row, t.col] as [number, number]);

    // Check blockout: does the new piece overlap existing blocks?
    if (!isValidPosition(state.board, tileOffsets, spawnRow, spawnCol)) {
      return false; // blockout
    }

    state.activePiece = {
      type,
      tiles,
      rotation: 0,
      row: spawnRow,
      col: spawnCol,
    };

    // Update next piece preview (3 ahead)
    state.nextPieces = bag.peekN(3).map(p => ({ type: p.type, colors: [...p.colors] }));

    // Update ghost
    state.ghostRow = getGhostRow(state.board, state.activePiece);

    // Reset lock delay
    state.lockDelay = { active: false, timer: 0, resets: 0 };
    gravityAccumulator = 0;

    return true;
  }

  function holdCurrentPiece(): void {
    if (!state.activePiece || !state.canHold) return;
    const current = state.activePiece;
    const currentColors = current.tiles.map(t => t.color);

    if (state.holdPiece) {
      // Swap: spawn the held piece, hold the current one
      const held = state.holdPiece;
      state.holdPiece = { type: current.type, colors: currentColors };

      // Spawn the held piece
      const spawnRow = getSpawnRow(held.type);
      const spawnCol = getSpawnCol(held.type);
      const shapeOffsets = PIECE_SHAPES[held.type][0];
      const tiles: PieceTile[] = shapeOffsets.map((offset, i) => ({
        row: offset[0],
        col: offset[1],
        color: held.colors[i],
      }));
      const tileOffsets = tiles.map(t => [t.row, t.col] as [number, number]);

      if (!isValidPosition(state.board, tileOffsets, spawnRow, spawnCol)) {
        state.phase = 'gameover';
        return;
      }

      state.activePiece = { type: held.type, tiles, rotation: 0, row: spawnRow, col: spawnCol };
      state.ghostRow = getGhostRow(state.board, state.activePiece);
    } else {
      // No held piece — hold current, spawn next from bag
      state.holdPiece = { type: current.type, colors: currentColors };
      state.activePiece = null;
      if (!spawnPiece()) {
        state.phase = 'gameover';
        return;
      }
    }

    state.canHold = false;
    state.lockDelay = { active: false, timer: 0, resets: 0 };
    gravityAccumulator = 0;
    lastActionWasRotation = false;
  }

  function start(): void {
    // Fresh bag from seed
    const freshRng = createRng(seed);
    const freshBag = createBag(freshRng);
    Object.assign(bag, freshBag);

    // Reset input processor (clear stale DAS/ARR key states)
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
    gravityAccumulator = 0;

    if (!spawnPiece()) {
      state.phase = 'gameover';
    }
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

    if (direction === 'cw') {
      to = ((from + 1) % 4) as RotationState;
    } else if (direction === 'ccw') {
      to = ((from + 3) % 4) as RotationState;
    } else {
      to = ((from + 2) % 4) as RotationState;
    }

    const newShapeOffsets = PIECE_SHAPES[piece.type][to];
    const kicks = getKicks(piece.type, from, to);

    for (const [dx, dy] of kicks) {
      const newCol = piece.col + dx;
      const newRow = piece.row + dy;

      if (isValidPosition(state.board, newShapeOffsets, newRow, newCol)) {
        const oldColors = piece.tiles.map(t => t.color);

        // For O-piece: cycle colors since shape is identical across states.
        // For all other pieces: colors stay bound to physical tile via index.
        const useIdentity = piece.type !== 'O';
        const colorShift = useIdentity ? 0
          : direction === 'cw' ? 1 : direction === 'ccw' ? 3 : 2;
        const n = piece.tiles.length;

        const newTiles: PieceTile[] = newShapeOffsets.map((offset, i) => ({
          row: offset[0],
          col: offset[1],
          color: oldColors[(i + colorShift) % n],
        }));

        piece.tiles = newTiles;
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

  // T-spin detection: 3-corner rule
  // After a T-piece locks via rotation, check 4 corners of its 3x3 bounding box
  function detectTSpin(piece: ActivePiece): boolean {
    if (piece.type !== 'T') return false;
    if (!lastActionWasRotation) return false;

    // The T-piece center is at bounding box position [1,1] relative to origin
    // Corners of the 3x3 box: [0,0], [0,2], [2,0], [2,2]
    const corners: [number, number][] = [
      [piece.row + 0, piece.col + 0],
      [piece.row + 0, piece.col + 2],
      [piece.row + 2, piece.col + 0],
      [piece.row + 2, piece.col + 2],
    ];

    let occupied = 0;
    for (const [r, c] of corners) {
      if (r < 0 || r >= BOARD_HEIGHT || c < 0 || c >= BOARD_WIDTH) {
        occupied++; // out of bounds = occupied
      } else if (state.board[r][c] !== null) {
        occupied++;
      }
    }

    return occupied >= 3;
  }

  function lockCurrentPiece(): void {
    if (!state.activePiece) return;
    const piece = state.activePiece;

    // Handle bombs: explode instead of normal lock
    if (isBombType(piece.type)) {
      const bombRow = piece.row + piece.tiles[0].row;
      const bombCol = piece.col + piece.tiles[0].col;
      const bombResult = explodeBomb(
        state.board, bombRow, bombCol,
        piece.type as 'BOMB_ROW' | 'BOMB_COL' | 'BOMB_3X3'
      );
      state.board = bombResult.board;
      // Don't evaluate lines after bomb — explosion handles cleanup
      state.activePiece = null;
      state.canHold = true;
      if (!spawnPiece()) {
        state.phase = 'gameover';
      }
      return;
    }

    // Detect T-spin BEFORE locking (check against board without this piece)
    const tSpin = detectTSpin(piece);

    // Lock the piece onto the board
    state.board = lockPiece(state.board, piece);

    // Check lock-out: any tile in spawn zone (rows >= VISIBLE_HEIGHT)
    for (const tile of piece.tiles) {
      const r = piece.row + tile.row;
      if (r >= VISIBLE_HEIGHT) {
        state.phase = 'gameover';
        state.activePiece = null;
        return;
      }
    }

    // Evaluate lines
    const result = evaluateLines(state.board, state.lockedRowCount);
    state.board = result.board;
    state.lockedRowCount = result.lockedRowCount;
    state.score = updateScore(state.score, result.linesCleared, tSpin);

    state.activePiece = null;
    state.canHold = true; // reset hold lock on piece lock

    // Spawn next piece
    if (!spawnPiece()) {
      state.phase = 'gameover'; // blockout
    }
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
        return;
      case 'hold':
        holdCurrentPiece();
        return;
    }

    // Reset lock delay on successful move/rotate (if active)
    if (moved && state.lockDelay.active && state.lockDelay.resets < MAX_LOCK_RESETS) {
      state.lockDelay.timer = 0;
      state.lockDelay.resets++;
    }
  }

  function tick(dt: number): void {
    if (state.phase !== 'playing') return;

    // Update timer
    state.timeRemaining -= dt;
    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      // Lock piece immediately, evaluate, then gameover
      if (state.activePiece) {
        lockCurrentPiece();
      }
      state.phase = 'gameover';
      return;
    }

    if (!state.activePiece) return;

    // Process input actions from DAS/ARR
    inputProcessor.update(dt);
    const actions = inputProcessor.getActions();
    for (const action of actions) {
      handleAction(action);
      if (state.phase !== 'playing') return;
    }

    state.softDropping = inputProcessor.isSoftDropping();

    // Gravity
    if (state.softDropping && settings.handling.sdf === Infinity) {
      // Instant soft drop: move piece all the way down
      if (state.activePiece) {
        while (canMoveDown()) {
          tryMove(-1, 0);
        }
        if (!state.lockDelay.active) {
          state.lockDelay.active = true;
          state.lockDelay.timer = 0;
        }
      }
      gravityAccumulator = 0;
    } else {
      const gravityInterval = state.softDropping
        ? GRAVITY_INTERVAL / settings.handling.sdf
        : GRAVITY_INTERVAL;

      gravityAccumulator += dt;

      while (gravityAccumulator >= gravityInterval && state.activePiece) {
        gravityAccumulator -= gravityInterval;

        if (canMoveDown()) {
          tryMove(-1, 0);
          if (!canMoveDown() && !state.lockDelay.active) {
            state.lockDelay.active = true;
            state.lockDelay.timer = 0;
          }
        } else {
          if (!state.lockDelay.active) {
            state.lockDelay.active = true;
            state.lockDelay.timer = 0;
          }
        }
      }
    }

    // Lock delay
    if (state.lockDelay.active && state.activePiece) {
      // If piece can now move down (e.g., row below cleared), deactivate lock delay
      if (canMoveDown()) {
        state.lockDelay.active = false;
        state.lockDelay.timer = 0;
      } else {
        state.lockDelay.timer += dt;
        if (state.lockDelay.timer >= LOCK_DELAY || state.lockDelay.resets >= MAX_LOCK_RESETS) {
          lockCurrentPiece();
        }
      }
    }
  }

  function inputKeyDown(action: InputAction): void {
    if (state.phase !== 'playing') return;

    // Immediate actions (not DAS/ARR controlled)
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
