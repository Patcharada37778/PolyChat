import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getModel, providerModelMap, Provider } from '@/lib/models';
import { retrieve, getDocs } from '@/lib/rag';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const deepseekClient = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || 'not-configured',
});
const qwenClient = new OpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.QWEN_API_KEY || 'not-configured',
});

const encoder = new TextEncoder();

function sse(text: string) {
  return encoder.encode(`data: ${JSON.stringify({ text })}\n\n`);
}
function sseError(msg: string) {
  return encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`);
}
function sseDone() {
  return encoder.encode('data: [DONE]\n\n');
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, modelId, provider = 'gemini' } = await req.json();
  const model = getModel(modelId ?? 'fast');
  const lastMessage = messages[messages.length - 1];

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'short',
  });

  let ragSection = '';
  if (getDocs().length > 0) {
    const chunks = await retrieve(lastMessage.content);
    if (chunks.length > 0) {
      ragSection = '\n\n---\nRelevant document context:\n' +
        chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n') +
        '\n---\nUse the above when relevant. Cite [1], [2], etc.';
    }
  }

  const systemInstruction = `${model.systemPrompt}\n\nCurrent date/time: ${now} (ICT, Bangkok).${ragSection}`;
  const actualModel = providerModelMap[provider as Provider]?.[model.id as 'fast' | 'balanced' | 'pro']
    ?? providerModelMap.gemini[model.id as 'fast' | 'balanced' | 'pro'];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (provider === 'deepseek') {
          await streamOpenAICompat(controller, deepseekClient, messages, systemInstruction, actualModel, model.maxTokens);
        } else if (provider === 'qwen') {
          await streamOpenAICompat(controller, qwenClient, messages, systemInstruction, actualModel, model.maxTokens);
        } else {
          await streamGemini(controller, messages, systemInstruction, actualModel, model.maxTokens);
        }
        controller.enqueue(sseDone());
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(sseError(msg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}

async function streamGemini(
  controller: ReadableStreamDefaultController,
  messages: { role: string; content: string }[],
  systemInstruction: string,
  modelName: string,
  maxTokens: number,
) {
  const history = messages
    .slice(0, -1)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '...' }],
    }))
    .filter((_: unknown, i: number, arr: { role: string }[]) => {
      const firstUser = arr.findIndex((x) => x.role === 'user');
      return firstUser === -1 || i >= firstUser;
    });

  const lastMessage = messages[messages.length - 1];
  const gemini = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: { maxOutputTokens: maxTokens },
  });
  const chat = gemini.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage.content);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) controller.enqueue(sse(text));
  }
}

async function streamOpenAICompat(
  controller: ReadableStreamDefaultController,
  client: OpenAI,
  messages: { role: string; content: string }[],
  systemInstruction: string,
  modelName: string,
  maxTokens: number,
) {
  const history = messages
    .slice(0, -1)
    .filter((_: unknown, i: number, arr: { role: string }[]) => {
      const firstUser = arr.findIndex((x) => x.role === 'user');
      return firstUser === -1 || i >= firstUser;
    })
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content || '...',
    }));

  const lastMessage = messages[messages.length - 1];

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemInstruction },
    ...history,
    { role: 'user', content: lastMessage.content },
  ];

  const stream = await client.chat.completions.create({
    model: modelName,
    messages: chatMessages,
    stream: true,
    max_tokens: maxTokens,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) controller.enqueue(sse(text));
  }
}
