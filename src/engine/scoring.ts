import { ScoreState } from './types';

export function createScoreState(): ScoreState {
  return {
    score: 0,
    linesCleared: 0,
    combo: 0,
    lastClearCount: 0,
    tSpin: false,
  };
}

// Base points for line clears
function basePoints(lines: number, tSpin: boolean): number {
  if (tSpin) {
    // T-spin single = double points, T-spin double = quad points
    if (lines === 1) return 2;  // T-spin single -> double
    if (lines === 2) return 8;  // T-spin double -> quad
    // T-spin triple etc. — just treat as high value
    return lines * 4;
  }

  switch (lines) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 3;
    case 4: return 8;  // quad
    default: return lines * 2;
  }
}

// Combo modifier: combo count is 1-indexed (first consecutive clear = combo 1)
// Pattern: +1, +1, *2, *2, *3, *3, *4, *4, *5, *5, ..., caps at *8
// combo 1: +1, combo 2: +1, combo 3: *2, combo 4: *2, combo 5: *3, combo 6: *3, etc.
function applyCombo(points: number, combo: number): number {
  if (combo <= 0) return points;
  if (combo <= 2) return points + 1;              // +1 for combos 1-2
  const tier = Math.floor((combo - 1) / 2);       // 1,1,2,2,3,3,...
  const multiplier = Math.min(tier, 8);            // cap at *8
  return points * multiplier;
}

export function updateScore(
  state: ScoreState,
  linesClearedThisLock: number,
  tSpin: boolean = false
): ScoreState {
  if (linesClearedThisLock === 0) {
    // No clear: reset combo
    return {
      ...state,
      combo: 0,
      lastClearCount: 0,
      tSpin: false,
    };
  }

  const newCombo = state.combo + 1;
  const base = basePoints(linesClearedThisLock, tSpin);
  const points = applyCombo(base, newCombo);

  return {
    score: state.score + points,
    linesCleared: state.linesCleared + linesClearedThisLock,
    combo: newCombo,
    lastClearCount: linesClearedThisLock,
    tSpin,
  };
}
