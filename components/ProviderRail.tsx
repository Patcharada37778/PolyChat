'use client';

import { Provider } from '@/lib/models';
import { providerThemes } from '@/lib/providerThemes';

interface Props {
  active: Provider;
  onSelect: (p: Provider) => void;
}

export function ProviderRail({ active, onSelect }: Props) {
  return (
    <div
      className="w-[52px] flex flex-col items-center pt-[18px] gap-1.5 shrink-0 border-r"
      style={{ background: 'var(--ui-bg-rail)', borderColor: 'var(--ui-border)' }}
    >
      <ProviderBtn
        id="gemini"
        label="Gemini"
        active={active === 'gemini'}
        onClick={() => onSelect('gemini')}
        logo={<GeminiLogo />}
        activeRing={providerThemes.gemini.railRing}
      />
      <ProviderBtn
        id="deepseek"
        label="DeepSeek"
        active={active === 'deepseek'}
        onClick={() => onSelect('deepseek')}
        logo={<DeepSeekLogo />}
        activeRing={providerThemes.deepseek.railRing}
      />
      <ProviderBtn
        id="qwen"
        label="Qwen — coming soon"
        active={false}
        disabled
        onClick={() => {}}
        logo={<QwenLogo />}
        activeRing={providerThemes.qwen.railRing}
      />
    </div>
  );
}

function ProviderBtn({
  label,
  active,
  disabled,
  onClick,
  logo,
  activeRing,
}: {
  id: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  logo: React.ReactNode;
  activeRing: string;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          disabled ? 'opacity-30 cursor-not-allowed' : active ? '' : 'opacity-60 hover:opacity-100'
        }`}
        style={active ? {
          background: 'var(--ui-bg-card-hover)',
          boxShadow: `0 0 0 1.5px ${activeRing}`,
        } : {}}
        onMouseEnter={(e) => { if (!active && !disabled) e.currentTarget.style.background = 'var(--ui-bg-card)'; }}
        onMouseLeave={(e) => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}
      >
        {logo}
      </button>
      {/* Tooltip */}
      <div
        className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
        style={{ background: 'var(--ui-bg-card-hover)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-1)' }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Gemini logo — 4-pointed sparkle star with blue→purple gradient ── */
function GeminiLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gem-g" x1="12" y1="1" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#8AB4F8" />
          <stop offset="100%" stopColor="#C58AF9" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5 C11.6 7.2 8.8 9.6 1.5 12 C8.8 14.4 11.6 16.8 12 22.5 C12.4 16.8 15.2 14.4 22.5 12 C15.2 9.6 12.4 7.2 12 1.5 Z"
        fill="url(#gem-g)"
      />
    </svg>
  );
}

/* ── DeepSeek logo — whale silhouette on dark blue ── */
function DeepSeekLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#0C1E3A" />
      <path
        d="M5.5 13.5 C5.5 10.5 8.5 8.5 12 8.5 C15 8.5 17 10 18 12 C16.5 14.5 14.5 15.5 12 15.5 C9.5 15.5 7 14.5 5.5 13.5 Z"
        fill="#4D9FFF"
      />
      <path d="M5.5 13.5 C4 12 3 13.5 2.5 15 C4 14.5 5 14.5 5.5 13.5 Z" fill="#4D9FFF" />
      <path d="M12 8.5 C12.5 6.5 14 6 15 7 C14 7.5 13 8 12 8.5 Z" fill="#6BB5FF" />
      <circle cx="14.5" cy="11" r="1" fill="white" />
      <circle cx="14.8" cy="10.7" r="0.45" fill="#0C1E3A" />
    </svg>
  );
}

/* ── Qwen logo — stylised Q with Alibaba purple ── */
function QwenLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="qwen-g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7B3FE4" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill="url(#qwen-g)" />
      <circle cx="12" cy="11.5" r="4.5" stroke="white" strokeWidth="2" fill="none" />
      <line x1="15" y1="14" x2="18" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
