'use client';

import { useState, useEffect } from 'react';

export type AccentPreset = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'rainbow';

export const ACCENT_PRESETS: { id: AccentPreset; label: string; color: string }[] = [
  { id: 'default', label: 'Default', color: '#8B5CF6' },
  { id: 'red',     label: 'Red',     color: '#EF4444' },
  { id: 'orange',  label: 'Orange',  color: '#F97316' },
  { id: 'yellow',  label: 'Yellow',  color: '#EAB308' },
  { id: 'green',   label: 'Green',   color: '#22C55E' },
  { id: 'teal',    label: 'Teal',    color: '#14B8A6' },
  { id: 'blue',    label: 'Blue',    color: '#3B82F6' },
  { id: 'purple',  label: 'Purple',  color: '#9333EA' },
  { id: 'pink',    label: 'Pink',    color: '#EC4899' },
  { id: 'rainbow', label: 'Rainbow', color: 'rainbow' },
];

let rainbowTimer: ReturnType<typeof setInterval> | null = null;
let rainbowHue = 0;

export function applyAccent(colorOrPreset: string) {
  if (typeof window === 'undefined') return;
  if (rainbowTimer) { clearInterval(rainbowTimer); rainbowTimer = null; }
  if (colorOrPreset === 'rainbow') {
    const tick = () => {
      rainbowHue = (rainbowHue + 1) % 360;
      document.documentElement.style.setProperty('--ui-accent', `hsl(${rainbowHue},75%,60%)`);
    };
    tick();
    rainbowTimer = setInterval(tick, 40);
  } else {
    document.documentElement.style.setProperty('--ui-accent', colorOrPreset);
  }
}

export function initAccent() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('aion_accent') || '#8B5CF6';
  applyAccent(saved);
}

export function saveAccent(colorOrPreset: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('aion_accent', colorOrPreset);
  applyAccent(colorOrPreset);
  window.dispatchEvent(new Event('aion:accent'));
}

/** Returns the current accent hex (e.g. '#3B82F6'). Returns null for rainbow. */
export function useAccent(): string | null {
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const v = localStorage.getItem('aion_accent') || '#8B5CF6';
      setAccent(v === 'rainbow' ? null : v);
    };
    read();
    window.addEventListener('aion:accent', read);
    return () => window.removeEventListener('aion:accent', read);
  }, []);

  return accent;
}
