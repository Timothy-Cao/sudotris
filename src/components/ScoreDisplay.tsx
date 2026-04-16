'use client';

interface ScoreDisplayProps {
  score: number;
  linesCleared: number;
  combo: number;
}

export default function ScoreDisplay({ score, linesCleared, combo }: ScoreDisplayProps) {
  return (
    <div className="flex flex-col gap-2 text-white">
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Score</div>
        <div className="text-2xl font-mono font-bold">{score}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400">Lines</div>
        <div className="text-xl font-mono">{linesCleared}</div>
      </div>
      {combo > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-yellow-400">Combo</div>
          <div className="text-lg font-mono text-yellow-400">{combo}x</div>
        </div>
      )}
    </div>
  );
}
