'use client';

import { forwardRef } from 'react';

const NextPiecePreview = forwardRef<HTMLCanvasElement>(function NextPiecePreview(_, ref) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs uppercase tracking-wider text-gray-400">Next</div>
      <canvas
        ref={ref}
        width={120}
        height={240}
        className="rounded border border-gray-700"
      />
    </div>
  );
});

export default NextPiecePreview;
