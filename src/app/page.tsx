'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useGame } from '../hooks/useGame';
import { useSettings, getBestScore, setBestScore } from '../hooks/useSettings';
import { setCellSize } from '../renderer/colors';
import { TOTAL_VISIBLE_ROWS } from '../renderer/canvas';
import { BOARD_WIDTH } from '../engine/types';
import GameCanvas from '../components/GameCanvas';
import NextPiecePreview from '../components/NextPiecePreview';
import HoldPiecePreview from '../components/HoldPiecePreview';
import Timer from '../components/Timer';
import ScoreDisplay from '../components/ScoreDisplay';


function computeCellSize(): number {
  if (typeof window === 'undefined') return 32;
  const vh = window.innerHeight;
  // Reserve space: ~60px title, ~24px settings link, ~32px padding
  const available = vh - 116;
  // Board is TOTAL_VISIBLE_ROWS cells tall
  const fromHeight = Math.floor(available / TOTAL_VISIBLE_ROWS);
  // Also limit by width: board + 2 side panels (~160px each) + gaps
  const vw = window.innerWidth;
  const sideSpace = 360; // 2 panels + gaps
  const fromWidth = Math.floor((vw - sideSpace) / BOARD_WIDTH);
  return Math.max(16, Math.min(fromHeight, fromWidth, 44));
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const { settings, loaded } = useSettings();

  const [cellSz, setCellSz] = useState(32);

  useEffect(() => {
    function update() {
      const sz = computeCellSize();
      setCellSz(sz);
      setCellSize(sz);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Set cell size on the renderer before game starts
  setCellSize(cellSz);

  const { gameState, start, restart } = useGame(canvasRef, previewRef, holdCanvasRef, settings);

  if (!loaded || !gameState) {
    return (
      <main className="flex h-screen items-center justify-center bg-gray-950 text-white overflow-hidden">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  const phase = gameState.phase;
  const bestScore = getBestScore();

  if (phase === 'gameover' && gameState.score.score > bestScore) {
    setBestScore(gameState.score.score);
  }

  const previewCellSize = Math.max(16, Math.floor(cellSz * 0.65));

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-gray-950 text-white overflow-hidden select-none">
      {/* Title */}
      <div className="text-center shrink-0 py-1">
        <h1 className="text-xl font-bold tracking-tight">Sudotris</h1>
      </div>

      {/* Game area */}
      <div className="flex gap-4 items-start flex-1 min-h-0">
        {/* Left panel */}
        <div className="flex flex-col gap-3 items-center justify-start pt-2" style={{ width: previewCellSize * 5 + 16 }}>
          <HoldPiecePreview ref={holdCanvasRef} canHold={gameState.canHold} />
          <NextPiecePreview ref={previewRef} />
        </div>

        {/* Board */}
        <div className="relative">
          <GameCanvas ref={canvasRef} cellSize={cellSz} />

          {/* Menu overlay */}
          {phase === 'menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Sudotris</h2>
              {bestScore > 0 && (
                <p className="text-yellow-400 text-sm mb-4">Best: {bestScore.toLocaleString()}</p>
              )}
              <button
                onClick={start}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-lg transition-colors"
              >
                Play
              </button>
              <p className="text-gray-500 text-xs mt-3">Press R to restart</p>
            </div>
          )}

          {/* Game over overlay */}
          {phase === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">Game Over</h2>
              <div className="text-center mb-4">
                <p className="text-3xl font-mono font-bold text-yellow-400">
                  {gameState.score.score.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">
                  {gameState.score.linesCleared} sudoku clears
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

        {/* Right panel: Timer + Score + Best + Reset */}
        <div className="flex flex-col gap-3 pt-2" style={{ width: previewCellSize * 5 + 16 }}>
          <Timer timeRemaining={gameState.timeRemaining} />
          <ScoreDisplay
            score={gameState.score.score}
            linesCleared={gameState.score.linesCleared}
            combo={gameState.score.combo}
          />
          {bestScore > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-yellow-400">Best</div>
              <div className="text-lg font-mono text-yellow-400">{bestScore.toLocaleString()}</div>
            </div>
          )}
          {phase === 'playing' && (
            <button
              onClick={restart}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors mt-2"
            >
              Reset (R)
            </button>
          )}
        </div>
      </div>

      {/* Settings link */}
      <div className="shrink-0 py-1">
        <Link
          href="/settings"
          className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
        >
          Settings
        </Link>
      </div>
    </main>
  );
}
