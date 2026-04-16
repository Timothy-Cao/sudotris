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
import { createBoard, isValidPosition, lockPiece, evaluateLines, getGhostRow } from './board';
import { createBag, Bag } from './bag';
import { PIECE_SHAPES, getKicks, getSpawnCol, getSpawnRow, getRowMajorTiles } from './pieces';
import { createScoreState, updateScore } from './scoring';
import { createInputProcessor, InputProcessor } from './input';

export function createGame(dateStr: string, settings: Settings) {
  const seed = dateSeed(dateStr);
  const rng = createRng(seed);
  const bag = createBag(rng);
  const inputProcessor = createInputProcessor(settings.handling);

  let state: GameState = {
    board: createBoard(),
    lockedRows: new Set(),
    activePiece: null,
    ghostRow: null,
    nextPiece: null,
    phase: 'menu',
    score: createScoreState(),
    timeRemaining: GAME_DURATION,
    lockDelay: { active: false, timer: 0, resets: 0 },
    softDropping: false,
  };

  let gravityAccumulator = 0;

  function spawnPiece(): boolean {
    const bagPiece = bag.next();
    const { type, colors } = bagPiece;
    const spawnRow = getSpawnRow(type);
    const spawnCol = getSpawnCol(type);

    // Assign colors to tiles in row-major order
    const rowMajorOffsets = getRowMajorTiles(type, 0);
    const tiles: PieceTile[] = rowMajorOffsets.map((offset, i) => ({
      row: offset[0],
      col: offset[1],
      color: colors[i],
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

    // Update next piece preview
    const nextBag = bag.peek();
    state.nextPiece = { type: nextBag.type, colors: nextBag.colors };

    // Update ghost
    state.ghostRow = getGhostRow(state.board, state.activePiece);

    // Reset lock delay
    state.lockDelay = { active: false, timer: 0, resets: 0 };
    gravityAccumulator = 0;

    return true;
  }

  function start(): void {
    // Reset everything
    const newRng = createRng(seed);
    const newBag = createBag(newRng);
    // We need to re-assign since bag is const — restructure:
    // Actually let's rebuild state properly
    Object.assign(bag, newBag);

    state = {
      board: createBoard(),
      lockedRows: new Set(),
      activePiece: null,
      ghostRow: null,
      nextPiece: null,
      phase: 'playing',
      score: createScoreState(),
      timeRemaining: GAME_DURATION,
      lockDelay: { active: false, timer: 0, resets: 0 },
      softDropping: false,
    };
    gravityAccumulator = 0;

    // Need fresh bag — recreate from seed
    const freshRng = createRng(seed);
    const freshBag = createBag(freshRng);
    Object.assign(bag, freshBag);

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
        // Build new tiles preserving color assignment
        // Colors are bound to their position in the original row-major order
        // We need to map from old tile positions to new tile positions
        const newRowMajor = getRowMajorTiles(piece.type, to);
        const oldRowMajor = getRowMajorTiles(piece.type, from);

        // Colors stay with their index in the original spawn ordering
        // Since tiles were assigned in row-major order at spawn,
        // and we track which color goes with which "logical" tile,
        // we need to maintain the color-to-logical-tile mapping.
        //
        // The simplest approach: colors are assigned by index at spawn.
        // Tile index 0 always has color[0], tile index 1 has color[1], etc.
        // The shapes already define tiles in a consistent order per rotation.
        const newTiles: PieceTile[] = newRowMajor.map((offset, i) => ({
          row: offset[0],
          col: offset[1],
          color: piece.tiles[i].color,
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

  function lockCurrentPiece(): void {
    if (!state.activePiece) return;
    const piece = state.activePiece;

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
    const result = evaluateLines(state.board, state.lockedRows);
    state.board = result.board;
    state.lockedRows = result.lockedRows;
    state.score = updateScore(state.score, result.linesCleared);

    state.activePiece = null;

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
        break;
      case 'moveRight':
        moved = tryMove(0, 1);
        break;
      case 'rotateCW':
        moved = tryRotate('cw');
        break;
      case 'rotateCCW':
        moved = tryRotate('ccw');
        break;
      case 'rotate180':
        moved = tryRotate('180');
        break;
      case 'hardDrop':
        if (state.activePiece && state.ghostRow !== null) {
          state.activePiece.row = state.ghostRow;
          lockCurrentPiece();
        }
        return; // skip lock delay reset
      case 'softDrop':
        // Handled via isSoftDropping in tick
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
    const gravityInterval = state.softDropping
      ? (settings.handling.sdf === Infinity ? 0 : GRAVITY_INTERVAL / settings.handling.sdf)
      : GRAVITY_INTERVAL;

    gravityAccumulator += dt;

    while (gravityAccumulator >= gravityInterval && state.activePiece) {
      gravityAccumulator -= gravityInterval;

      if (canMoveDown()) {
        tryMove(-1, 0);
        // If piece can now rest, don't start lock delay yet — wait for next gravity tick
        if (!canMoveDown() && !state.lockDelay.active) {
          state.lockDelay.active = true;
          state.lockDelay.timer = 0;
        }
      } else {
        // Can't move down — activate lock delay if not already
        if (!state.lockDelay.active) {
          state.lockDelay.active = true;
          state.lockDelay.timer = 0;
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
    if (action === 'rotateCW' || action === 'rotateCCW' || action === 'rotate180' || action === 'hardDrop') {
      handleAction(action);
    } else {
      inputProcessor.keyDown(action);
    }
  }

  function inputKeyUp(action: InputAction): void {
    inputProcessor.keyUp(action);
  }

  function getState(): GameState {
    return { ...state };
  }

  function updateSettings(newSettings: Settings): void {
    inputProcessor.updateHandling(newSettings.handling);
  }

  return { start, tick, inputKeyDown, inputKeyUp, getState, updateSettings };
}

export type Game = ReturnType<typeof createGame>;
