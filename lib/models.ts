export type Provider = 'gemini' | 'deepseek' | 'qwen';
export type ModelTier = 'fast' | 'balanced' | 'pro';

export interface Model {
  id: ModelTier;
  name: string;
  description: string;
  geminiModel: string;
  icon: string;
  systemPrompt: string;
  maxTokens: number;
}

export interface ProviderInfo {
  id: Provider;
  name: string;
  available: boolean;
}

export const providerList: ProviderInfo[] = [
  { id: 'gemini',   name: 'Gemini',   available: true  },
  { id: 'deepseek', name: 'DeepSeek', available: true  },
  { id: 'qwen',     name: 'Qwen',     available: false },
];

// Which underlying model to call for each provider + tier
export const providerModelMap: Record<Provider, Record<ModelTier, string>> = {
  gemini: {
    fast:     'gemini-2.5-flash',
    balanced: 'gemini-2.5-flash',
    pro:      'gemini-2.5-pro',
  },
  deepseek: {
    fast:     'deepseek-chat',
    balanced: 'deepseek-chat',
    pro:      'deepseek-reasoner',
  },
  qwen: {
    fast:     'qwen-turbo',
    balanced: 'qwen-plus',
    pro:      'qwen-max',
  },
};

const FILE_INSTRUCTIONS = `
When the user asks you to create a document, spreadsheet, or presentation, generate the content using these exact code block types:

For a document/report/essay: use \`\`\`document ... \`\`\`  with Markdown inside.
For a spreadsheet/table/data: use \`\`\`spreadsheet ... \`\`\`  with CSV inside (first row = headers).
For a presentation/slides: use \`\`\`slides ... \`\`\`  with this format:
---
# Slide Title
content here (use - for bullets)
---
# Next Slide
more content
---

Always use these blocks for file creation requests. The user's app will render download buttons automatically.`;

export const models: Model[] = [
  {
    id: 'fast',
    name: 'Fast',
    geminiModel: 'gemini-2.5-flash',
    icon: '⚡',
    description: 'Quick answers, images & files',
    systemPrompt: `You are a fast, concise AI assistant. Answer directly and briefly. ${FILE_INSTRUCTIONS}`,
    maxTokens: 1024,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    geminiModel: 'gemini-2.5-flash',
    icon: '🌟',
    description: 'Thoughtful answers, images & files',
    systemPrompt: `You are a thoughtful, balanced AI assistant. Provide clear and comprehensive responses. ${FILE_INSTRUCTIONS}`,
    maxTokens: 2048,
  },
  {
    id: 'pro',
    name: 'Pro',
    geminiModel: 'gemini-2.5-pro',
    icon: '🧠',
    description: 'Deep reasoning, images & files',
    systemPrompt: `You are a highly capable AI assistant. Think step by step and provide deep, nuanced responses. ${FILE_INSTRUCTIONS}`,
    maxTokens: 4096,
  },
];

export function getModel(id: string): Model {
  return models.find((m) => m.id === id) ?? models[0];
}
