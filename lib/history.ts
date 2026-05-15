'use client';

import { Message } from '@/types';
import { Provider } from '@/lib/models';

export interface Conversation {
  id: string;
  title: string;
  modelId: 'fast' | 'balanced' | 'pro';
  provider: Provider;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const KEY = 'polychat_history';

export function getHistory(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveConversation(conv: Conversation) {
  const all = getHistory();
  const idx = all.findIndex((c) => c.id === conv.id);
  if (idx >= 0) all[idx] = conv;
  else all.unshift(conv);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 100)));
}

export function deleteConversation(id: string) {
  const all = getHistory().filter((c) => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function groupByDate(convs: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - 7);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const c of convs) {
    const d = new Date(c.updatedAt);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= week) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}
