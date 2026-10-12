'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_STORAGE_KEY as STORAGE_KEY } from './theme-script';

/**
 * Light / dark theme. Default = 'system' (follows the device); the visitor can force 'light' or 'dark'.
 * The resolved theme is the `dark` class on <html> (see the dark variant in globals.css).
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const CHANGE_EVENT = 'atelierzo-theme-change';

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function applyPreference(preference: ThemePreference) {
  const dark =
    preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreferenceState(readPreference());
    setMounted(true);

    // Keep every toggle on the page in sync, and follow the device while on 'system'
    const onChange = () => setPreferenceState(readPreference());
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (readPreference() === 'system') applyPreference('system');
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    media.addEventListener('change', onSystemChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
      media.removeEventListener('change', onSystemChange);
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked: the choice still applies for this page view
    }
    applyPreference(next);
    setPreferenceState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { preference, setPreference, mounted };
}
