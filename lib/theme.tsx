'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initAccent } from '@/lib/accent';

type ThemeMode = 'dark' | 'light';

interface ThemeCtx {
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ mode: 'dark', isDark: true, toggle: () => {} });

const DARK: Record<string, string> = {
  '--ui-bg':           '#0d0d0d',
  '--ui-bg-sidebar':   '#0f0f0f',
  '--ui-bg-main':      '#111111',
  '--ui-bg-rail':      '#090909',
  '--ui-bg-card':      'rgba(255,255,255,0.05)',
  '--ui-bg-card-hover':'rgba(255,255,255,0.09)',
  '--ui-border':       'rgba(255,255,255,0.03)',
  '--ui-input-bg':     'rgba(255,255,255,0.05)',
  '--ui-input-border': 'rgba(255,255,255,0.1)',
  '--ui-text-1':       '#ffffff',
  '--ui-text-2':       '#9ca3af',
  '--ui-text-3':       '#4b5563',
  '--ui-scrollbar':    'rgba(255,255,255,0.1)',
  '--ui-scrollbar-h':  'rgba(255,255,255,0.2)',
  '--ui-prose':        '#d1d5db',
  '--ui-code-bg':      'rgba(0,0,0,0.45)',
  '--background':      '#0d0d0d',
  '--foreground':      '#ededed',
};

const LIGHT: Record<string, string> = {
  '--ui-bg':           '#f0f2f5',
  '--ui-bg-sidebar':   '#ffffff',
  '--ui-bg-main':      '#f8f9fb',
  '--ui-bg-rail':      '#e8eaed',
  '--ui-bg-card':      'rgba(0,0,0,0.04)',
  '--ui-bg-card-hover':'rgba(0,0,0,0.07)',
  '--ui-border':       'rgba(0,0,0,0.05)',
  '--ui-input-bg':     'rgba(0,0,0,0.04)',
  '--ui-input-border': 'rgba(0,0,0,0.12)',
  '--ui-text-1':       '#111827',
  '--ui-text-2':       '#4b5563',
  '--ui-text-3':       '#9ca3af',
  '--ui-scrollbar':    'rgba(0,0,0,0.15)',
  '--ui-scrollbar-h':  'rgba(0,0,0,0.25)',
  '--ui-prose':        '#374151',
  '--ui-code-bg':      'rgba(0,0,0,0.06)',
  '--background':      '#f0f2f5',
  '--foreground':      '#111827',
};

function applyVars(mode: ThemeMode) {
  const root = document.documentElement;
  const vars = mode === 'light' ? LIGHT : DARK;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('aion_theme') as ThemeMode | null;
    const initial = (saved === 'light' || saved === 'dark') ? saved : 'dark';
    setMode(initial);
    applyVars(initial);
    initAccent();
  }, []);

  useEffect(() => {
    applyVars(mode);
    localStorage.setItem('aion_theme', mode);
  }, [mode]);

  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ mode, isDark: mode === 'dark', toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
