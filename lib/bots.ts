import { Bot } from '@/types';

export const bots: Bot[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    description: 'Fast & efficient for quick tasks',
    model: 'gemini-2.5-flash',
    provider: 'google',
    icon: '⚡',
    systemPrompt: 'You are a fast and efficient AI assistant. Provide concise, direct, helpful responses.',
    color: '#6366f1',
    badge: 'Fast',
    maxTokens: 1024,
  },
  {
    id: 'gemini-balanced',
    name: 'Gemini Balanced',
    description: 'Thoughtful answers for everyday tasks',
    model: 'gemini-2.5-flash',
    provider: 'google',
    icon: '🌟',
    systemPrompt: 'You are a thoughtful and balanced AI assistant. Provide clear, well-structured, comprehensive responses.',
    color: '#8b5cf6',
    badge: 'Popular',
    maxTokens: 2048,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Deep reasoning for complex problems',
    model: 'gemini-2.5-pro',
    provider: 'google',
    icon: '🧠',
    systemPrompt: 'You are an advanced AI assistant with strong reasoning. Think step by step and provide deep, nuanced responses.',
    color: '#a855f7',
    badge: 'Pro',
    maxTokens: 4096,
  },
  // ── Media Generation ────────────────────────────────
  {
    id: 'image-creator',
    name: 'Image Creator',
    description: 'Generate images from text prompts',
    model: '',
    provider: 'google',
    mode: 'image',
    icon: '🎨',
    systemPrompt: '',
    color: '#f97316',
    badge: 'New',
    maxTokens: 0,
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'Specialized for programming',
    model: 'gemini-2.5-flash',
    provider: 'google',
    icon: '💻',
    systemPrompt:
      'You are a specialized coding assistant. Help with programming, debugging, code review, and architecture. Always provide working code examples with markdown code blocks and language tags.',
    color: '#06b6d4',
    maxTokens: 4096,
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Stories, poems & creative content',
    model: 'gemini-2.5-flash',
    provider: 'google',
    icon: '✍️',
    systemPrompt:
      'You are a creative writing assistant. Help craft compelling stories, poems, scripts, and creative content. Be imaginative and expressive.',
    color: '#ec4899',
    maxTokens: 4096,
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Analysis, research & insights',
    model: 'gemini-2.5-flash',
    provider: 'google',
    icon: '📊',
    systemPrompt:
      'You are a data analyst and research assistant. Analyze data, research topics, identify trends, and present findings clearly with structured reasoning.',
    color: '#14b8a6',
    maxTokens: 2048,
  },
];

export function getBotById(id: string): Bot | undefined {
  return bots.find((bot) => bot.id === id);
}
