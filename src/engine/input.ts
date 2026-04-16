import { HandlingConfig, InputAction } from './types';

interface KeyState {
  pressed: boolean;
  holdTime: number;
  dasCharged: boolean;
  arrAccumulator: number;
  firedInitial: boolean;
}

export function createInputProcessor(handling: HandlingConfig) {
  const keyStates = new Map<string, KeyState>();
  const pendingActions: InputAction[] = [];

  // Map of direction keys to actions
  const horizontalActions = new Set<InputAction>(['moveLeft', 'moveRight']);

  function getOrCreateState(key: string): KeyState {
    if (!keyStates.has(key)) {
      keyStates.set(key, {
        pressed: false,
        holdTime: 0,
        dasCharged: false,
        arrAccumulator: 0,
        firedInitial: false,
      });
    }
    return keyStates.get(key)!;
  }

  function keyDown(action: InputAction): void {
    if (horizontalActions.has(action)) {
      const state = getOrCreateState(action);
      if (!state.pressed) {
        state.pressed = true;
        state.holdTime = 0;
        state.dasCharged = false;
        state.arrAccumulator = 0;
        state.firedInitial = false;
        // Fire immediately on press
        pendingActions.push(action);
        state.firedInitial = true;
      }
    } else if (action === 'softDrop') {
      const state = getOrCreateState(action);
      state.pressed = true;
    } else {
      // Rotation, hard drop: fire once on press
      pendingActions.push(action);
    }
  }

  function keyUp(action: InputAction): void {
    const state = getOrCreateState(action);
    state.pressed = false;
    state.holdTime = 0;
    state.dasCharged = false;
    state.arrAccumulator = 0;
    state.firedInitial = false;
  }

  function update(dt: number): void {
    for (const action of ['moveLeft', 'moveRight'] as InputAction[]) {
      const state = keyStates.get(action);
      if (!state || !state.pressed) continue;

      state.holdTime += dt;

      if (!state.dasCharged) {
        // Waiting for DAS to charge
        if (state.holdTime >= handling.das) {
          state.dasCharged = true;
          state.arrAccumulator = 0;

          if (handling.arr === 0) {
            // Instant: teleport to wall
            for (let i = 0; i < 20; i++) {
              pendingActions.push(action);
            }
          } else {
            pendingActions.push(action);
          }
        }
      } else {
        // DAS charged, apply ARR
        if (handling.arr === 0) {
          // Already handled on charge
        } else {
          state.arrAccumulator += dt;
          while (state.arrAccumulator >= handling.arr) {
            state.arrAccumulator -= handling.arr;
            pendingActions.push(action);
          }
        }
      }
    }
  }

  function getActions(): InputAction[] {
    const actions = [...pendingActions];
    pendingActions.length = 0;
    return actions;
  }

  function isSoftDropping(): boolean {
    const state = keyStates.get('softDrop');
    return state?.pressed ?? false;
  }

  function updateHandling(newHandling: HandlingConfig): void {
    handling = newHandling;
  }

  return { keyDown, keyUp, update, getActions, isSoftDropping, updateHandling };
}

export type InputProcessor = ReturnType<typeof createInputProcessor>;
