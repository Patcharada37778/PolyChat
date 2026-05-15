'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  X, User, Settings, HelpCircle, Sun, Moon, Upload,
  ExternalLink, Bug, FileText, Shield, Headphones,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { ACCENT_PRESETS, saveAccent } from '@/lib/accent';

interface Props {
  onClose: () => void;
}

type Tab = 'profile' | 'general' | 'help';

export function SettingsModal({ onClose }: Props) {
  const { data: session } = useSession();
  const { isDark, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General
  const [accentColor, setAccentColor] = useState('#8B5CF6');
  const [customColor, setCustomColor] = useState('#8B5CF6');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');

  useEffect(() => {
    setDisplayName(localStorage.getItem('aion_display_name') || session?.user?.name || '');
    setUsername(localStorage.getItem('aion_username') || session?.user?.email?.split('@')[0] || '');
    setAvatar(localStorage.getItem('aion_avatar'));

    const savedAccent = localStorage.getItem('aion_accent') || '#8B5CF6';
    setAccentColor(savedAccent);
    if (savedAccent !== 'rainbow') setCustomColor(savedAccent);

    setSelectedVoiceURI(localStorage.getItem('aion_voice_uri') || '');

    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() ?? [];
      if (v.length > 0) {
        const seen = new Set<string>();
        setVoices(v.filter((voice) => {
          if (seen.has(voice.voiceURI)) return false;
          seen.add(voice.voiceURI);
          return true;
        }));
      }
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, [session]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    localStorage.setItem('aion_display_name', displayName);
    localStorage.setItem('aion_username', username);
    if (avatar) localStorage.setItem('aion_avatar', avatar);
    else localStorage.removeItem('aion_avatar');
    setProfileSaved(true);
    window.dispatchEvent(new Event('aion:profile'));
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleAccentSelect = (colorOrPreset: string) => {
    setAccentColor(colorOrPreset);
    if (colorOrPreset !== 'rainbow') setCustomColor(colorOrPreset);
    saveAccent(colorOrPreset);
  };

  const handleCustomColor = (color: string) => {
    setCustomColor(color);
    setAccentColor(color);
    saveAccent(color);
  };

  const handleVoiceSelect = (voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    localStorage.setItem('aion_voice_uri', voiceURI);
    const voice = voices.find((v) => v.voiceURI === voiceURI);
    if (voice) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance('Hello, this is how I sound.');
      utt.voice = voice;
      utt.lang = voice.lang;
      window.speechSynthesis.speak(utt);
    }
  };

  const initials = (displayName || session?.user?.name || '?')[0]?.toUpperCase();

  const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'general', icon: Settings, label: 'General' },
    { id: 'help', icon: HelpCircle, label: 'Help' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--ui-bg-sidebar)',
          boxShadow: '0 32px 96px rgba(0,0,0,0.65)',
          maxHeight: 'min(660px, calc(100vh - 2rem))',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0 border-b"
          style={{ borderColor: 'var(--ui-border)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--ui-text-1)' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ui-text-3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ui-bg-card)';
              e.currentTarget.style.color = 'var(--ui-text-1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--ui-text-3)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left nav */}
          <nav
            className="w-44 shrink-0 border-r py-3 px-2 space-y-0.5"
            style={{ borderColor: 'var(--ui-border)', background: 'var(--ui-bg-rail)' }}
          >
            {TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                style={{
                  background: tab === id ? 'var(--ui-bg-card-hover)' : 'transparent',
                  color: tab === id ? 'var(--ui-text-1)' : 'var(--ui-text-2)',
                  fontWeight: tab === id ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (tab !== id) e.currentTarget.style.background = 'var(--ui-bg-card)';
                }}
                onMouseLeave={(e) => {
                  if (tab !== id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ui-text-1)' }}>
                  Profile
                </h3>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold shrink-0"
                      style={{
                        background: avatar
                          ? undefined
                          : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                      }}
                    >
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div
                      className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.45)' }}
                    >
                      <Upload size={16} className="text-white" />
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: 'var(--ui-input-border)',
                        color: 'var(--ui-text-2)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Upload photo
                    </button>
                    {avatar && (
                      <button
                        onClick={() => setAvatar(null)}
                        className="ml-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
                        style={{ color: '#f87171' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs mt-1.5" style={{ color: 'var(--ui-text-3)' }}>
                      JPG, PNG or GIF · Max 2 MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--ui-text-2)' }}
                  >
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--ui-input-bg)',
                      border: '1px solid var(--ui-input-border)',
                      color: 'var(--ui-text-1)',
                    }}
                  />
                </div>

                {/* Username */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--ui-text-2)' }}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--ui-input-bg)',
                      border: '1px solid var(--ui-input-border)',
                      color: 'var(--ui-text-1)',
                    }}
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  {profileSaved ? '✓ Saved!' : 'Save changes'}
                </button>

                {/* Account + sign out */}
                <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--ui-border)' }}>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--ui-text-3)' }}>
                      Signed in as
                    </p>
                    <p className="text-sm" style={{ color: 'var(--ui-text-2)' }}>
                      {session?.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-sm px-4 py-2 rounded-xl transition-colors"
                    style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* ── GENERAL ── */}
            {tab === 'general' && (
              <div className="space-y-7">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ui-text-1)' }}>
                  General
                </h3>

                {/* Theme */}
                <div>
                  <label
                    className="block text-xs font-medium mb-3"
                    style={{ color: 'var(--ui-text-2)' }}
                  >
                    Theme
                  </label>
                  <div className="flex gap-2">
                    {(['dark', 'light'] as const).map((m) => {
                      const active = (m === 'dark') === isDark;
                      return (
                        <button
                          key={m}
                          onClick={() => { if (!active) toggle(); }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-colors"
                          style={{
                            background: active ? 'var(--ui-bg-card-hover)' : 'transparent',
                            borderColor: active ? 'var(--ui-input-border)' : 'var(--ui-border)',
                            color: active ? 'var(--ui-text-1)' : 'var(--ui-text-2)',
                          }}
                        >
                          {m === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                          {m === 'dark' ? 'Dark' : 'Light'}
                          {active && <span className="text-xs opacity-50">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent color */}
                <div>
                  <label
                    className="block text-xs font-medium mb-3"
                    style={{ color: 'var(--ui-text-2)' }}
                  >
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2.5 mb-3">
                    {ACCENT_PRESETS.map((preset) => {
                      const isActive =
                        preset.color === 'rainbow'
                          ? accentColor === 'rainbow'
                          : accentColor === preset.color;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleAccentSelect(preset.color)}
                          title={preset.label}
                          className="w-8 h-8 rounded-full transition-transform hover:scale-110 relative flex items-center justify-center"
                          style={
                            preset.color === 'rainbow'
                              ? {
                                  background:
                                    'conic-gradient(red,orange,yellow,green,cyan,blue,violet,red)',
                                  outline: isActive ? '2.5px solid var(--ui-text-1)' : 'none',
                                  outlineOffset: 2,
                                }
                              : {
                                  background: preset.color,
                                  outline: isActive ? '2.5px solid var(--ui-text-1)' : 'none',
                                  outlineOffset: 2,
                                }
                          }
                        >
                          {isActive && (
                            <span className="text-white text-[10px] font-bold drop-shadow">✓</span>
                          )}
                        </button>
                      );
                    })}

                    {/* Custom color picker */}
                    <label
                      title="Custom color"
                      className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center border-2 border-dashed relative overflow-hidden transition-transform hover:scale-110"
                      style={{ borderColor: 'var(--ui-input-border)' }}
                    >
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => handleCustomColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <span style={{ color: 'var(--ui-text-2)', fontSize: 18, lineHeight: 1 }}>+</span>
                    </label>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--ui-text-3)' }}>
                    Current: <span style={{ color: accentColor === 'rainbow' ? undefined : accentColor }}
                      className={accentColor === 'rainbow' ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent' : ''}>
                      {accentColor === 'rainbow' ? 'Rainbow' : accentColor}
                    </span>
                  </p>
                </div>

                {/* Voice */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--ui-text-2)' }}
                  >
                    Voice
                  </label>
                  <p className="text-xs mb-3" style={{ color: 'var(--ui-text-3)' }}>
                    Choose a text-to-speech voice. Click to preview.
                  </p>
                  <div
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--ui-input-border)' }}
                  >
                    <div className="max-h-52 overflow-y-auto">
                      {voices.length === 0 ? (
                        <p
                          className="text-xs px-3 py-4 text-center"
                          style={{ color: 'var(--ui-text-3)' }}
                        >
                          No voices found on this device.
                        </p>
                      ) : (
                        voices.map((voice, i) => {
                          const active = selectedVoiceURI === voice.voiceURI;
                          return (
                            <button
                              key={`${voice.voiceURI}-${i}`}
                              onClick={() => handleVoiceSelect(voice.voiceURI)}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left border-b last:border-0 transition-colors"
                              style={{
                                borderColor: 'var(--ui-border)',
                                background: active ? 'var(--ui-bg-card-hover)' : 'transparent',
                                color: active ? 'var(--ui-text-1)' : 'var(--ui-text-2)',
                              }}
                              onMouseEnter={(e) => {
                                if (!active)
                                  e.currentTarget.style.background = 'var(--ui-bg-card)';
                              }}
                              onMouseLeave={(e) => {
                                if (!active) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div>
                                <span className="font-medium">{voice.name}</span>
                                <span
                                  className="ml-2 text-xs"
                                  style={{ color: 'var(--ui-text-3)' }}
                                >
                                  {voice.lang}
                                </span>
                              </div>
                              {active && (
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: 'var(--ui-accent, #8B5CF6)' }}
                                >
                                  ✓ Active
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  {selectedVoiceURI && (
                    <button
                      className="mt-2 text-xs transition-colors"
                      style={{ color: 'var(--ui-text-3)' }}
                      onClick={() => {
                        setSelectedVoiceURI('');
                        localStorage.removeItem('aion_voice_uri');
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = 'var(--ui-text-2)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'var(--ui-text-3)')
                      }
                    >
                      Reset to auto-detect
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── HELP ── */}
            {tab === 'help' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ui-text-1)' }}>
                  Help &amp; Support
                </h3>
                {[
                  {
                    icon: Headphones,
                    label: 'Help Center',
                    desc: 'Browse guides and FAQs',
                    href: '#',
                  },
                  {
                    icon: FileText,
                    label: 'Terms of Service',
                    desc: 'Read our terms and conditions',
                    href: '#',
                  },
                  {
                    icon: Shield,
                    label: 'Privacy Policy',
                    desc: 'How we handle your data',
                    href: '#',
                  },
                  {
                    icon: Bug,
                    label: 'Report a Bug',
                    desc: 'Send a report to our team',
                    href: 'mailto:aionagentic@gmail.com',
                  },
                ].map(({ icon: Icon, label, desc, href }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors"
                    style={{
                      borderColor: 'var(--ui-border)',
                      color: 'var(--ui-text-2)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--ui-bg-card)';
                      e.currentTarget.style.color = 'var(--ui-text-1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--ui-text-2)';
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--ui-bg-card)' }}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--ui-text-1)' }}
                      >
                        {label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ui-text-3)' }}>
                        {desc}
                      </p>
                    </div>
                    <ExternalLink size={13} style={{ color: 'var(--ui-text-3)' }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
