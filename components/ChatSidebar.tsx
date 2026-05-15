'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Sparkles, Plus, Trash2, MessageSquare, Search, Star, Settings, Sun, Moon } from 'lucide-react';
import {
  getHistory, deleteConversation, toggleStarConversation,
  groupByDate, Conversation,
} from '@/lib/history';
import { useTheme } from '@/lib/theme';

interface Props {
  activeId?: string;
  userId: string;
  onSelect: (conv: Conversation) => void;
  onNew: () => void;
}

export function ChatSidebar({ activeId, userId, onSelect, onNew }: Props) {
  const { data: session } = useSession();
  const { isDark, toggle } = useTheme();
  const [allConvs, setAllConvs] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    if (!userId) return;
    setAllConvs(getHistory(userId));
  };

  useEffect(() => { refresh(); }, [userId]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('aion:history', handler);
    return () => window.removeEventListener('aion:history', handler);
  }, [userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id, userId);
    refresh();
  };

  const handleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleStarConversation(id, userId);
    refresh();
  };

  const q = search.trim().toLowerCase();
  const starred = allConvs.filter((c) => c.starred && (!q || c.title.toLowerCase().includes(q)));
  const unstarred = allConvs.filter((c) => !c.starred && (!q || c.title.toLowerCase().includes(q)));
  const groups = groupByDate(unstarred);
  const noResults = q && starred.length === 0 && unstarred.length === 0;

  return (
    <aside
      className="w-64 flex flex-col h-screen shrink-0 border-r"
      style={{ background: 'var(--ui-bg-sidebar)', borderColor: 'var(--ui-border)' }}
    >
      {/* Logo + New chat */}
      <div className="px-3 py-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="font-semibold tracking-tight text-sm" style={{ color: 'var(--ui-text-1)' }}>
            AIon
          </span>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-colors"
          style={{ background: 'var(--ui-bg-card)', color: 'var(--ui-text-2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
        >
          <Plus size={15} />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--ui-input-bg)', border: '1px solid var(--ui-border)' }}
        >
          <Search size={13} style={{ color: 'var(--ui-text-3)', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: 'var(--ui-text-1)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs" style={{ color: 'var(--ui-text-3)' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <nav className="flex-1 overflow-y-auto py-1 px-2">
        {/* Starred */}
        {starred.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1" style={{ color: 'var(--ui-text-3)' }}>
              Starred
            </p>
            {starred.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeId}
                onSelect={onSelect}
                onDelete={handleDelete}
                onStar={handleStar}
              />
            ))}
          </div>
        )}

        {/* No results */}
        {noResults && (
          <p className="text-center text-xs px-4 py-6" style={{ color: 'var(--ui-text-3)' }}>
            No results for &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Empty state */}
        {!q && allConvs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-xs gap-2" style={{ color: 'var(--ui-text-3)' }}>
            <MessageSquare size={18} className="opacity-40" />
            <span>No conversations yet</span>
          </div>
        )}

        {/* Date groups */}
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1" style={{ color: 'var(--ui-text-3)' }}>
              {group.label}
            </p>
            {group.items.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeId}
                onSelect={onSelect}
                onDelete={handleDelete}
                onStar={handleStar}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: user + settings */}
      <div className="p-3 border-t relative" style={{ borderColor: 'var(--ui-border)' }}>
        {session && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {session.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--ui-text-1)' }}>
                {session.user?.name}
              </p>
            </div>

            {/* Settings trigger + popover */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: showSettings ? 'var(--ui-text-1)' : 'var(--ui-text-3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Settings size={13} />
              </button>

              {showSettings && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-44 rounded-xl overflow-hidden z-40"
                  style={{
                    background: 'var(--ui-bg-sidebar)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  }}
                >
                  <div className="p-1">
                    <button
                      onClick={toggle}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors"
                      style={{ color: 'var(--ui-text-2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                      {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    <div className="h-px mx-2 my-1" style={{ background: 'var(--ui-border)' }} />
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors text-red-400"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--ui-bg-card)';
                        e.currentTarget.style.color = '#f87171';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#f87171';
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function ConvItem({
  conv, active, onSelect, onDelete, onStar,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: (c: Conversation) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onStar: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conv)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(conv)}
      className="group w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-left transition-colors mb-0.5 cursor-pointer"
      style={{
        background: active ? 'var(--ui-bg-card-hover)' : 'transparent',
        color: active ? 'var(--ui-text-1)' : 'var(--ui-text-2)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--ui-bg-card)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span className="flex-1 text-sm truncate">{conv.title}</span>

      {/* Star */}
      <button
        onClick={(e) => onStar(e, conv.id)}
        className={`shrink-0 p-0.5 rounded transition-all ${conv.starred ? '' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ color: conv.starred ? '#EAB308' : 'var(--ui-text-3)' }}
        onMouseEnter={(e) => !conv.starred && (e.currentTarget.style.color = '#EAB308')}
        onMouseLeave={(e) => !conv.starred && (e.currentTarget.style.color = 'var(--ui-text-3)')}
      >
        <Star size={12} fill={conv.starred ? '#EAB308' : 'none'} />
      </button>

      {/* Delete */}
      <button
        onClick={(e) => onDelete(e, conv.id)}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded transition-all"
        style={{ color: 'var(--ui-text-3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ui-text-3)')}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
