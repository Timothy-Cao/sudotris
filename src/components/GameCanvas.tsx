'use client';

import { forwardRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../renderer/canvas';

const GameCanvas = forwardRef<HTMLCanvasElement>(function GameCanvas(_, ref) {
  return (
    <canvas
      ref={ref}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="rounded-lg border-2 border-gray-700"
    />
  );
});

export default GameCanvas;
