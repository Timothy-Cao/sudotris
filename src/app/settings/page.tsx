'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Settings,
  InputAction,
  DEFAULT_SETTINGS,
  KeyBindings,
  HandlingConfig,
} from '../../engine/types';

const SETTINGS_KEY = 'sudotris-settings';

const ACTION_LABELS: Record<InputAction, string> = {
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  rotateCW: 'Rotate CW',
  rotateCCW: 'Rotate CCW',
  rotate180: 'Rotate 180',
  hardDrop: 'Hard Drop',
  softDrop: 'Soft Drop',
};

const ACTION_ORDER: InputAction[] = [
  'moveLeft',
  'moveRight',
  'softDrop',
  'hardDrop',
  'rotateCW',
  'rotateCCW',
  'rotate180',
];

function formatKeyCode(code: string): string {
  return code
    .replace('Arrow', '')
    .replace('Key', '')
    .replace('Digit', '')
    .replace('Left', 'L-')
    .replace('Right', 'R-')
    .replace('Control', 'Ctrl');
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [listening, setListening] = useState<InputAction | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load settings
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({
          keyBindings: { ...DEFAULT_SETTINGS.keyBindings, ...parsed.keyBindings },
          handling: { ...DEFAULT_SETTINGS.handling, ...parsed.handling },
          showNumbers: parsed.showNumbers ?? DEFAULT_SETTINGS.showNumbers,
        });
      } catch {
        // use defaults
      }
    }
    setLoaded(true);
  }, []);

  // Save settings on change
  const save = useCallback((s: Settings) => {
    setSettings(s);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }, []);

  // Listen for key rebind
  useEffect(() => {
    if (!listening) return;

    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setListening(null);
        return;
      }

      const newBindings: KeyBindings = { ...settings.keyBindings, [listening!]: e.code };
      save({ ...settings, keyBindings: newBindings });
      setListening(null);
    }

    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [listening, settings, save]);

  function updateHandling(key: keyof HandlingConfig, value: number) {
    const newHandling = { ...settings.handling, [key]: value };
    save({ ...settings, handling: newHandling });
  }

  function resetToDefaults() {
    save(DEFAULT_SETTINGS);
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-950 text-white p-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300 text-sm mb-6 block"
        >
          &larr; Back to Game
        </Link>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Key Bindings */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-300">Controls</h2>
          <div className="flex flex-col gap-2">
            {ACTION_ORDER.map(action => (
              <div
                key={action}
                className="flex items-center justify-between bg-gray-900 rounded px-4 py-2"
              >
                <span className="text-sm">{ACTION_LABELS[action]}</span>
                <button
                  onClick={() => setListening(action)}
                  className={`px-3 py-1 rounded text-sm font-mono min-w-[80px] text-center transition-colors ${
                    listening === action
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {listening === action ? '...' : formatKeyCode(settings.keyBindings[action])}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Handling */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-300">Handling</h2>

          {/* DAS */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>DAS (Delayed Auto Shift)</span>
              <span className="font-mono text-gray-400">{settings.handling.das}ms</span>
            </div>
            <input
              type="range"
              min={0}
              max={300}
              step={1}
              value={settings.handling.das}
              onChange={e => updateHandling('das', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* ARR */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>ARR (Auto Repeat Rate)</span>
              <span className="font-mono text-gray-400">
                {settings.handling.arr === 0 ? 'Instant' : `${settings.handling.arr}ms`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings.handling.arr}
              onChange={e => updateHandling('arr', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* SDF */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>SDF (Soft Drop Factor)</span>
              <span className="font-mono text-gray-400">
                {settings.handling.sdf >= 40 ? 'Instant' : `${settings.handling.sdf}x`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={41}
              step={1}
              value={settings.handling.sdf >= 40 ? 41 : settings.handling.sdf}
              onChange={e => {
                const val = Number(e.target.value);
                updateHandling('sdf', val >= 41 ? Infinity : val);
              }}
              className="w-full accent-indigo-500"
            />
          </div>
        </section>

        {/* Display */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-300">Display</h2>
          <label className="flex items-center gap-3 bg-gray-900 rounded px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showNumbers}
              onChange={e => save({ ...settings, showNumbers: e.target.checked })}
              className="accent-indigo-500 w-4 h-4"
            />
            <span className="text-sm">Show color numbers on tiles</span>
          </label>
        </section>

        {/* Reset */}
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </main>
  );
}
