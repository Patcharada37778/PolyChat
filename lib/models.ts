export interface Model {
  id: 'fast' | 'balanced' | 'pro';
  name: string;
  description: string;
  geminiModel: string;
  icon: string;
  systemPrompt: string;
  maxTokens: number;
}

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
