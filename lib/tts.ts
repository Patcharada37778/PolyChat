/** Detect language from Unicode script ranges. Returns BCP-47 tag or '' for Latin scripts. */
export function detectScriptLang(text: string): string {
  /* eslint-disable no-control-regex */
  if (/[฀-๿]/.test(text)) return 'th-TH';
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja-JP';
  if (/[一-鿿㐀-䶿]/.test(text)) return 'zh-CN';
  if (/[가-힣]/.test(text)) return 'ko-KR';
  if (/[؀-ۿ]/.test(text)) return 'ar-SA';
  if (/[ऀ-ॿ]/.test(text)) return 'hi-IN';
  if (/[Ѐ-ӿ]/.test(text)) return 'ru-RU';
  if (/[Ͱ-Ͽ]/.test(text)) return 'el-GR';
  if (/[ঀ-৿]/.test(text)) return 'bn-BD';
  if (/[஀-௿]/.test(text)) return 'ta-IN';
  if (/[ಀ-೿]/.test(text)) return 'kn-IN';
  if (/[ഀ-ൿ]/.test(text)) return 'ml-IN';
  if (/[਀-੿]/.test(text)) return 'pa-IN';
  if (/[઀-૿]/.test(text)) return 'gu-IN';
  if (/[଀-୿]/.test(text)) return 'or-IN';
  if (/[ༀ-࿿]/.test(text)) return 'bo-CN';
  if (/[֐-׿]/.test(text)) return 'he-IL';
  if (/[Ⴀ-ჿ]/.test(text)) return 'ka-GE';
  if (/[԰-֏]/.test(text)) return 'hy-AM';
  /* eslint-enable no-control-regex */
  return '';
}

const FEMALE_NAMES = [
  'samantha', 'ava', 'allison', 'susan', 'karen', 'moira', 'fiona',
  'tessa', 'veena', 'victoria', 'zira', 'hazel', 'aria', 'jenny',
  'nova', 'shimmer', 'echo',
];
const AVOID = [
  'fred', 'albert', 'bad news', 'bahh', 'bells', 'boing',
  'bubbles', 'cellos', 'deranged', 'good news', 'hysterical',
  'pipe organ', 'trinoids', 'whisper', 'zarvox',
];

/**
 * Pick the most natural available voice for a language.
 * Ranking: Chrome Google online > premium > enhanced > other > compact.
 * Prefers female-sounding voices; avoids known robotic ones.
 */
export function getBestVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!lang || voices.length === 0) return null;
  const prefix = lang.split('-')[0];
  const matching = voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(`${prefix}-`) || v.lang === prefix,
  );
  if (matching.length === 0) return null;

  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    const u = v.voiceURI.toLowerCase();
    if (AVOID.some((x) => n.includes(x))) return -1;
    let s = 0;
    if (n.startsWith('google') && v.localService === false) s += 60;
    else if (n.startsWith('google')) s += 50;
    else if (u.includes('premium')) s += 40;
    else if (u.includes('enhanced')) s += 30;
    else if (n.includes('siri')) s += 20;
    else if (u.includes('compact')) s += 0;
    else s += 10;
    if (n.includes('female') || FEMALE_NAMES.some((f) => n.includes(f))) s += 20;
    if (n.includes('male') && !n.includes('female')) s -= 15;
    return s;
  };

  return [...matching].sort((a, b) => score(b) - score(a))[0];
}
