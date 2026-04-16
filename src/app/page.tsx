'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useGame } from '../hooks/useGame';
import { useSettings, getBestScore, setBestScore } from '../hooks/useSettings';
import GameCanvas from '../components/GameCanvas';
import NextPiecePreview from '../components/NextPiecePreview';
import Timer from '../components/Timer';
import ScoreDisplay from '../components/ScoreDisplay';

function getTodayDisplay(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const { settings, loaded } = useSettings();
  const { gameState, start, restart } = useGame(canvasRef, previewRef, settings);

  if (!loaded || !gameState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  const phase = gameState.phase;
  const bestScore = getBestScore();

  // Update best score on game over
  if (phase === 'gameover' && gameState.score.score > bestScore) {
    setBestScore(gameState.score.score);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white gap-4 p-4">
      {/* Title + Date */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Sudotris</h1>
        <p className="text-sm text-gray-400 mt-1">{getTodayDisplay()}</p>
      </div>

      {/* Game area */}
      <div className="flex gap-6 items-start">
        {/* Left panel: Next piece */}
        <div className="flex flex-col gap-4 w-32 items-center">
          <NextPiecePreview ref={previewRef} />
        </div>

        {/* Board */}
        <div className="relative">
          <GameCanvas ref={canvasRef} />

          {/* Menu overlay */}
          {phase === 'menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Sudotris</h2>
              <p className="text-gray-400 text-sm mb-1">Daily Puzzle</p>
              {bestScore > 0 && (
                <p className="text-yellow-400 text-sm mb-4">Best: {bestScore}</p>
              )}
              <button
                onClick={start}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-lg transition-colors"
              >
                Play
              </button>
            </div>
          )}

          {/* Game over overlay */}
          {phase === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Game Over</h2>
              <div className="text-center mb-4">
                <p className="text-3xl font-mono font-bold text-yellow-400">
                  {gameState.score.score}
                </p>
                <p className="text-sm text-gray-400">
                  {gameState.score.linesCleared} lines cleared
                </p>
                {gameState.score.score > bestScore && gameState.score.score > 0 && (
                  <p className="text-green-400 text-sm mt-1">New Best!</p>
                )}
              </div>
              <button
                onClick={restart}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Right panel: Timer + Score */}
        <div className="flex flex-col gap-4 w-32">
          <Timer timeRemaining={gameState.timeRemaining} />
          <ScoreDisplay
            score={gameState.score.score}
            linesCleared={gameState.score.linesCleared}
          />
        </div>
      </div>

      {/* Settings link */}
      <Link
        href="/settings"
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors mt-2"
      >
        Settings
      </Link>
    </main>
  );
}
