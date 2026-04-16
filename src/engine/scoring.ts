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

// Base points for line clears (x1000)
function basePoints(lines: number, tSpin: boolean): number {
  if (tSpin) {
    if (lines === 1) return 2000;  // T-spin single -> double value
    if (lines === 2) return 8000;  // T-spin double -> quad value
    return lines * 4000;
  }

  switch (lines) {
    case 1: return 1000;
    case 2: return 2000;
    case 3: return 3000;
    case 4: return 8000;  // quad
    default: return lines * 2000;
  }
}

// Combo modifier: combo count is 1-indexed (first consecutive clear = combo 1)
// Pattern: +1000, +1000, *2, *2, *3, *3, *4, *4, ..., caps at *8
function applyCombo(points: number, combo: number): number {
  if (combo <= 0) return points;
  if (combo <= 2) return points + 1000;
  const tier = Math.floor((combo - 1) / 2);
  const multiplier = Math.min(tier, 8);
  return points * multiplier;
}

// +100 per tile cleared
const POINTS_PER_TILE = 100;

export function updateScore(
  state: ScoreState,
  linesClearedThisLock: number,
  tSpin: boolean = false,
  tilesCleared: number = 0
): ScoreState {
  // Tile bonus applies regardless of line clears (bombs, etc.)
  const tileBonus = tilesCleared * POINTS_PER_TILE;

  if (linesClearedThisLock === 0) {
    return {
      ...state,
      score: state.score + tileBonus,
      combo: 0,
      lastClearCount: 0,
      tSpin: false,
    };
  }

  const newCombo = state.combo + 1;
  const base = basePoints(linesClearedThisLock, tSpin);
  const points = applyCombo(base, newCombo) + tileBonus;

  return {
    score: state.score + points,
    linesCleared: state.linesCleared + linesClearedThisLock,
    combo: newCombo,
    lastClearCount: linesClearedThisLock,
    tSpin,
  };
}
