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

export function updateScore(
  state: ScoreState,
  linesClearedThisLock: number
): ScoreState {
  const newCombo = linesClearedThisLock > 0 ? state.combo + 1 : 0;
  return {
    score: state.score + linesClearedThisLock,
    linesCleared: state.linesCleared + linesClearedThisLock,
    combo: newCombo,
    lastClearCount: linesClearedThisLock,
    tSpin: false, // stub for MVP
  };
}
