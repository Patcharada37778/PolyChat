import { Provider } from './models';

function hexToRgb(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

function darkenHex(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const d = (s: string) => Math.max(0, Math.floor(parseInt(s, 16) * 0.82)).toString(16).padStart(2, '0');
  return `#${d(m[1])}${d(m[2])}${d(m[3])}`;
}

export interface ProviderTheme {
  primaryColor: string;
  primaryHover: string;
  chatBgTint: string;
  userBubbleBg: string;
  userBubbleBorder: string;
  dotColor: string;
  textareaBorderFocus: string;
  imageActiveBg: string;
  imageActiveBorder: string;
  imageActiveColor: string;
  docsActiveBg: string;
  docsActiveColor: string;
  railRing: string;
  downloadBtnBg: string;
  downloadBtnColor: string;
  blockquoteBorder: string;
  codeColor: string;
}

/** Returns the provider theme, overriding all primary colors with the accent hex when provided. */
export function getProviderTheme(provider: Provider, accentHex?: string | null): ProviderTheme {
  const base = providerThemes[provider];
  if (!accentHex || !accentHex.startsWith('#')) return base;
  const rgb = hexToRgb(accentHex);
  if (!rgb) return base;
  return {
    ...base,
    primaryColor:      accentHex,
    primaryHover:      darkenHex(accentHex),
    chatBgTint:        `rgba(${rgb},0.10)`,
    userBubbleBg:      `rgba(${rgb},0.18)`,
    userBubbleBorder:  `rgba(${rgb},0.25)`,
    dotColor:          accentHex,
    textareaBorderFocus: `rgba(${rgb},0.5)`,
    imageActiveBg:     `rgba(${rgb},0.15)`,
    imageActiveBorder: `rgba(${rgb},0.3)`,
    imageActiveColor:  accentHex,
    docsActiveBg:      `rgba(${rgb},0.1)`,
    docsActiveColor:   accentHex,
    railRing:          `rgba(${rgb},0.5)`,
    downloadBtnBg:     `rgba(${rgb},0.15)`,
    downloadBtnColor:  accentHex,
    blockquoteBorder:  accentHex,
    codeColor:         accentHex,
  };
}

export const providerThemes: Record<Provider, ProviderTheme> = {
  gemini: {
    primaryColor: '#3B82F6',
    primaryHover: '#2563EB',
    chatBgTint: 'rgba(59,130,246,0.10)',
    userBubbleBg: 'rgba(59,130,246,0.18)',
    userBubbleBorder: 'rgba(96,165,250,0.25)',
    dotColor: '#60A5FA',
    textareaBorderFocus: 'rgba(59,130,246,0.5)',
    imageActiveBg: 'rgba(59,130,246,0.15)',
    imageActiveBorder: 'rgba(96,165,250,0.3)',
    imageActiveColor: '#93C5FD',
    docsActiveBg: 'rgba(59,130,246,0.1)',
    docsActiveColor: '#60A5FA',
    railRing: 'rgba(59,130,246,0.35)',
    downloadBtnBg: 'rgba(59,130,246,0.15)',
    downloadBtnColor: '#93C5FD',
    blockquoteBorder: '#3B82F6',
    codeColor: '#93C5FD',
  },
  deepseek: {
    primaryColor: '#1D4ED8',
    primaryHover: '#1E40AF',
    chatBgTint: 'rgba(29,78,216,0.11)',
    userBubbleBg: 'rgba(29,78,216,0.22)',
    userBubbleBorder: 'rgba(59,130,246,0.22)',
    dotColor: '#3B82F6',
    textareaBorderFocus: 'rgba(29,78,216,0.55)',
    imageActiveBg: 'rgba(29,78,216,0.2)',
    imageActiveBorder: 'rgba(59,130,246,0.3)',
    imageActiveColor: '#93C5FD',
    docsActiveBg: 'rgba(29,78,216,0.15)',
    docsActiveColor: '#60A5FA',
    railRing: 'rgba(29,78,216,0.45)',
    downloadBtnBg: 'rgba(29,78,216,0.2)',
    downloadBtnColor: '#93C5FD',
    blockquoteBorder: '#1D4ED8',
    codeColor: '#93C5FD',
  },
  qwen: {
    primaryColor: '#9333EA',
    primaryHover: '#7C3AED',
    chatBgTint: 'rgba(147,51,234,0.10)',
    userBubbleBg: 'rgba(147,51,234,0.18)',
    userBubbleBorder: 'rgba(168,85,247,0.25)',
    dotColor: '#C084FC',
    textareaBorderFocus: 'rgba(147,51,234,0.5)',
    imageActiveBg: 'rgba(147,51,234,0.15)',
    imageActiveBorder: 'rgba(168,85,247,0.3)',
    imageActiveColor: '#D8B4FE',
    docsActiveBg: 'rgba(147,51,234,0.1)',
    docsActiveColor: '#C084FC',
    railRing: 'rgba(147,51,234,0.35)',
    downloadBtnBg: 'rgba(147,51,234,0.15)',
    downloadBtnColor: '#D8B4FE',
    blockquoteBorder: '#9333EA',
    codeColor: '#D8B4FE',
  },
};
