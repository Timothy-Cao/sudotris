'use client';

import { forwardRef } from 'react';
import { BOARD_WIDTH } from '../engine/types';
import { TOTAL_VISIBLE_ROWS } from '../renderer/canvas';

interface GameCanvasProps {
  cellSize: number;
}

const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(
  function GameCanvas({ cellSize }, ref) {
    return (
      <canvas
        ref={ref}
        width={BOARD_WIDTH * cellSize}
        height={TOTAL_VISIBLE_ROWS * cellSize}
        className="rounded-lg border-2 border-gray-700"
      />
    );
  }
);

export default GameCanvas;
