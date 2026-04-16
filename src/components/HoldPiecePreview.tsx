'use client';

import { forwardRef } from 'react';

interface HoldPiecePreviewProps {
  canHold: boolean;
}

const HoldPiecePreview = forwardRef<HTMLCanvasElement, HoldPiecePreviewProps>(
  function HoldPiecePreview({ canHold }, ref) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`text-xs uppercase tracking-wider ${canHold ? 'text-gray-400' : 'text-red-400'}`}>
          Hold
        </div>
        <canvas
          ref={ref}
          width={120}
          height={80}
          className={`rounded border ${canHold ? 'border-gray-700' : 'border-red-900/50'}`}
        />
      </div>
    );
  }
);

export default HoldPiecePreview;
