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

const CLEAR_BASE = 1000;

export function updateScore(
  state: ScoreState,
  sudokuClears: number,
): ScoreState {
  if (sudokuClears === 0) {
    // No clears: reset combo
    return {
      ...state,
      combo: 0,
      lastClearCount: 0,
      tSpin: false,
    };
  }

  // Each consecutive clear in a combo gives increasing points:
  // First clear = combo 1 -> +1000, second = combo 2 -> +2000, etc.
  let points = 0;
  let combo = state.combo;
  for (let i = 0; i < sudokuClears; i++) {
    combo++;
    points += combo * CLEAR_BASE;
  }

  return {
    score: state.score + points,
    linesCleared: state.linesCleared + sudokuClears,
    combo,
    lastClearCount: sudokuClears,
    tSpin: false,
  };
}
