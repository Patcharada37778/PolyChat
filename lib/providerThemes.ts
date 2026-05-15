import { Provider } from './models';

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

export const providerThemes: Record<Provider, ProviderTheme> = {
  gemini: {
    primaryColor: '#3B82F6',
    primaryHover: '#2563EB',
    chatBgTint: 'rgba(59,130,246,0.04)',
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
    chatBgTint: 'rgba(29,78,216,0.05)',
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
    chatBgTint: 'rgba(147,51,234,0.04)',
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
