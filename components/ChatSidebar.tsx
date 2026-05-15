'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Sparkles, Plus, Trash2, LogOut, MessageSquare } from 'lucide-react';
import { getHistory, deleteConversation, groupByDate, Conversation } from '@/lib/history';

interface Props {
  activeId?: string;
  onSelect: (conv: Conversation) => void;
  onNew: () => void;
}

export function ChatSidebar({ activeId, onSelect, onNew }: Props) {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<ReturnType<typeof groupByDate>>([]);

  const refresh = () => setGroups(groupByDate(getHistory()));

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('polychat:history', handler);
    return () => window.removeEventListener('polychat:history', handler);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    refresh();
  };

  return (
    <aside className="w-64 bg-[#0f0f0f] border-r border-white/5 flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-3 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="text-white font-semibold tracking-tight">PolyChat</span>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm transition-colors"
        >
          <Plus size={15} />
          New chat
        </button>
      </div>

      {/* History */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs gap-2">
            <MessageSquare size={18} className="opacity-40" />
            <span>No conversations yet</span>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 mb-1">
                {group.label}
              </p>
              {group.items.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(conv)}
                  className={`group w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors mb-0.5 cursor-pointer ${
                    conv.id === activeId
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <span className="flex-1 text-sm truncate">{conv.title}</span>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0 p-0.5 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        {session && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {session.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{session.user?.name}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
