'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../engine/types';

const SETTINGS_KEY = 'sudotris-settings';
const BEST_SCORE_KEY = 'sudotris-best';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

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

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => {
      const next: Settings = {
        keyBindings: { ...prev.keyBindings, ...partial.keyBindings },
        handling: { ...prev.handling, ...partial.handling },
        showNumbers: partial.showNumbers ?? prev.showNumbers,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings, loaded };
}

export function getBestScore(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(BEST_SCORE_KEY);
  return stored ? parseInt(stored, 10) || 0 : 0;
}

export function setBestScore(score: number): void {
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}
