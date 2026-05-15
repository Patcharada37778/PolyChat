export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mediaUrl?: string;
  mediaType?: 'image';
  timestamp: string;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  model: string;
  icon: string;
  systemPrompt: string;
  color: string;
  badge?: string;
  maxTokens: number;
  provider: 'google' | 'openai';
  mode?: 'chat' | 'image';
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
