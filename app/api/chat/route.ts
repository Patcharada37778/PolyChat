import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getModel } from '@/lib/models';
import { retrieve, getDocs } from '@/lib/rag';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, modelId } = await req.json();
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

  const history = messages
    .slice(0, -1)
    .map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '...' }],
    }))
    .filter((_: unknown, i: number, arr: { role: string }[]) => {
      // Gemini requires history to start with 'user' — drop leading model turns
      const firstUser = arr.findIndex((x) => x.role === 'user');
      return firstUser === -1 || i >= firstUser;
    });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const gemini = genAI.getGenerativeModel({
          model: model.geminiModel,
          systemInstruction,
          generationConfig: { maxOutputTokens: model.maxTokens },
        });
        const chat = gemini.startChat({ history });
        const result = await chat.sendMessageStream(lastMessage.content);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
