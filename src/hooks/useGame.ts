'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { createGame, Game, GameEvent } from '../engine/game';
import { drawBoard, drawNextPieces, drawHoldPiece, setRenderSettings } from '../renderer/canvas';
import { tickAnimations, hasActiveAnimations, animateLineClear, animateBombExplosion, animatePenaltyRow } from '../renderer/animations';
import { Settings, GameState, InputAction } from '../engine/types';

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useGame(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  previewRef: React.RefObject<HTMLCanvasElement | null>,
  holdRef: React.RefObject<HTMLCanvasElement | null>,
  settings: Settings
) {
  const gameRef = useRef<Game | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const restartRef = useRef<(() => void) | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Build reverse key map: code -> action
  const keyMapRef = useRef<Map<string, InputAction>>(new Map());

  useEffect(() => {
    const map = new Map<string, InputAction>();
    for (const [action, code] of Object.entries(settings.keyBindings)) {
      map.set(code, action as InputAction);
    }
    keyMapRef.current = map;
  }, [settings.keyBindings]);

  function handleGameEvent(event: GameEvent) {
    switch (event.type) {
      case 'lineClear':
        animateLineClear(event.rows);
        break;
      case 'penalty':
        animatePenaltyRow(event.rows);
        break;
      case 'bombExplode':
        animateBombExplosion(event.row, event.col, event.bombType);
        break;
    }
  }

  // Create game on mount
  useEffect(() => {
    const dateStr = getTodayDateStr();
    gameRef.current = createGame(dateStr, settings, handleGameEvent);
    setGameState(gameRef.current.getState());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update settings on change
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Game loop
  const startLoop = useCallback(() => {
    lastTimeRef.current = performance.now();

    function loop(now: number) {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const game = gameRef.current;
      if (!game) return;

      game.tick(dt);
      tickAnimations(dt);
      const state = game.getState();
      setGameState(state);

      // Update render settings
      setRenderSettings(settingsRef.current.showNumbers, settingsRef.current.ghostOpacity);

      // Draw board
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawBoard(ctx, state);
      }

      // Draw next piece preview
      const preview = previewRef.current;
      if (preview) {
        const pctx = preview.getContext('2d');
        if (pctx) drawNextPieces(pctx, state.nextPieces);
      }

      // Draw hold piece
      const hold = holdRef.current;
      if (hold) {
        const hctx = hold.getContext('2d');
        if (hctx) drawHoldPiece(hctx, state.holdPiece, state.canHold);
      }

      if (state.phase === 'playing' || hasActiveAnimations()) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        setGameState(state);
      }
    }

    animFrameRef.current = requestAnimationFrame(loop);
  }, [canvasRef, previewRef, holdRef]);

  // Keyboard input
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // R = restart (works in any phase)
      if (e.code === 'KeyR') {
        e.preventDefault();
        restartRef.current?.();
        return;
      }

      const game = gameRef.current;
      if (!game || game.getState().phase !== 'playing') return;

      // Suppress browser shortcuts while playing (Cmd+R, Cmd+L, etc.)
      // Can't suppress Cmd+Q/Cmd+W/Fn but most others work
      if (e.metaKey || e.ctrlKey || e.altKey) {
        e.preventDefault();
      }

      const action = keyMapRef.current.get(e.code);
      if (action) {
        e.preventDefault();
        game.inputKeyDown(action);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      const game = gameRef.current;
      if (!game) return;

      const action = keyMapRef.current.get(e.code);
      if (action) {
        e.preventDefault();
        game.inputKeyUp(action);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const start = useCallback(() => {
    const game = gameRef.current;
    if (game) {
      game.start();
      startLoop();
    }
  }, [startLoop]);

  const restart = useCallback(() => {
    // Cancel existing loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    // Recreate game with same date seed
    const dateStr = getTodayDateStr();
    gameRef.current = createGame(dateStr, settings, handleGameEvent);
    gameRef.current.start();
    startLoop();
  }, [settings, startLoop]);

  // Keep ref in sync for keyboard handler
  restartRef.current = restart;

  return { gameState, start, restart };
}
