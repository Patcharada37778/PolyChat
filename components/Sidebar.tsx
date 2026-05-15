'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { bots } from '@/lib/bots';
import { LogOut, Sparkles, ChevronRight } from 'lucide-react';

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0f0f0f] border-r border-white/5 flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5">
        <Link href="/chat" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">PolyChat</span>
        </Link>
      </div>

      {/* Bot list */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
          AI Models
        </p>
        {bots.map((bot) => {
          const isActive = pathname === `/chat/${bot.id}`;
          return (
            <Link
              key={bot.id}
              href={`/chat/${bot.id}`}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-150 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <span className="text-xl leading-none">{bot.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{bot.name}</span>
                  {bot.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium shrink-0">
                      {bot.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 truncate mt-0.5">{bot.description}</p>
              </div>
              {isActive && <ChevronRight size={14} className="text-gray-500 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/5">
        {session ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {session.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{session.user?.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{session.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
