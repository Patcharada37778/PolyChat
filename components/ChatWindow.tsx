'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '@/types';
import { Model, models, getModel, Provider } from '@/lib/models';
import { Conversation, saveConversation } from '@/lib/history';
import {
  Send, StopCircle, BookOpen, Loader2, Image as ImageIcon,
  ChevronDown, Paperclip, Download,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DocumentPanel } from './DocumentPanel';

interface Props {
  conversation: Conversation | null;
  provider: Provider;
  onConversationUpdate: (conv: Conversation) => void;
}

export function ChatWindow({ conversation, provider, onConversationUpdate }: Props) {
  const [messages, setMessages] = useState<Message[]>(conversation?.messages ?? []);
  const [modelId, setModelId] = useState<'fast' | 'balanced' | 'pro'>(conversation?.modelId ?? 'fast');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [docCount, setDocCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const convIdRef = useRef<string>(conversation?.id ?? crypto.randomUUID());
  const convCreatedAtRef = useRef<string>(conversation?.createdAt ?? new Date().toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  const model = getModel(modelId);

  useEffect(() => {
    if (conversation) {
      setMessages(conversation.messages);
      setModelId(conversation.modelId);
      convIdRef.current = conversation.id;
      convCreatedAtRef.current = conversation.createdAt;
    } else {
      setMessages([]);
      setModelId('fast');
      convIdRef.current = crypto.randomUUID();
      convCreatedAtRef.current = new Date().toISOString();
    }
    setInput('');
    setIsStreaming(false);
    setIsThinking(false);
    setImageMode(false);
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const stop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setIsThinking(false);
  };

  const persistConversation = useCallback(
    (msgs: Message[], mid: 'fast' | 'balanced' | 'pro') => {
      const title = msgs.find((m) => m.role === 'user')?.content.slice(0, 60) ?? 'New conversation';
      const now = new Date().toISOString();
      const conv: Conversation = {
        id: convIdRef.current,
        title,
        modelId: mid,
        provider,
        messages: msgs,
        createdAt: convCreatedAtRef.current,
        updatedAt: now,
      };
      saveConversation(conv);
      window.dispatchEvent(new Event('polychat:history'));
      onConversationUpdate(conv);
    },
    [onConversationUpdate, provider],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      const assistantId = crypto.randomUUID();
      const withAssistant: Message[] = [
        ...newMessages,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
      ];
      setMessages(withAssistant);
      setIsThinking(true);
      setIsStreaming(true);

      abortRef.current = new AbortController();

      const updateAssistant = (update: Partial<Message>) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...update } : m)));

      const showError = (msg: string) => updateAssistant({ content: `⚠️ ${msg}` });

      const IMAGE_RE = /^(generate|create|draw|make|show|produce|paint|design)\s+(me\s+)?(a|an|the|some\s+)?(image|photo|picture|artwork|illustration|painting|drawing|portrait|landscape|wallpaper|avatar)\b/i;
      const isImageRequest = imageMode || IMAGE_RE.test(content.trim());

      if (isImageRequest) {
        try {
          const res = await fetch('/api/generate/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: content.trim() }),
            signal: abortRef.current.signal,
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
          const patch: Partial<Message> = {
            content: `Here's your image for: *${content.trim()}*`,
            mediaUrl: data.url,
            mediaType: 'image',
          };
          updateAssistant(patch);
          persistConversation(
            withAssistant.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
            modelId,
          );
        } catch (err: unknown) {
          if (err instanceof Error && err.name !== 'AbortError') showError(err.message);
        } finally {
          setIsThinking(false);
          setIsStreaming(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId,
            provider,
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }

        setIsThinking(false);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) { showError(parsed.error); return; }
              if (parsed.text) {
                fullText += parsed.text;
                updateAssistant({ content: fullText });
              }
            } catch { /* skip malformed chunk */ }
          }
        }

        persistConversation(
          withAssistant.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)),
          modelId,
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        showError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsThinking(false);
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, modelId, provider, imageMode, persistConversation],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setUploadingFile(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDocCount((c) => c + 1);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ Document **"${file.name}"** uploaded (${data.chunkCount} chunks). I'll use it as context for our conversation.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Failed to upload "${file.name}": ${err instanceof Error ? err.message : 'Upload failed'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      className="flex flex-col h-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-purple-500/10 border-2 border-dashed border-purple-500/50 rounded-lg pointer-events-none flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-purple-400">
            <Paperclip size={32} />
            <span className="text-lg font-medium">Drop file to upload</span>
          </div>
        </div>
      )}

      {showDocs && (
        <DocumentPanel onClose={() => setShowDocs(false)} onDocsChange={setDocCount} />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <EmptyState model={model} onSend={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} modelIcon={model.icon} />
            ))}
            {isThinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0">
                  {model.icon}
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="px-4 pb-4 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative" ref={modelPickerRef}>
              <button
                onClick={() => setShowModelPicker((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
              >
                <span>{model.icon}</span>
                <span>{model.name}</span>
                <ChevronDown size={13} className={`transition-transform ${showModelPicker ? 'rotate-180' : ''}`} />
              </button>
              {showModelPicker && (
                <div className="absolute bottom-full mb-2 left-0 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-48 z-20">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setModelId(m.id); setShowModelPicker(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                        modelId === m.id ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      <span>{m.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-gray-600">{m.description}</p>
                      </div>
                      {modelId === m.id && <span className="text-purple-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setImageMode((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                imageMode
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              <ImageIcon size={13} />
              <span>Image</span>
            </button>

            <button
              onClick={() => setShowDocs(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                docCount > 0
                  ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              <BookOpen size={13} />
              <span>Docs{docCount > 0 ? ` (${docCount})` : ''}</span>
            </button>

            {uploadingFile && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                <Loader2 size={12} className="animate-spin" />
                Uploading…
              </div>
            )}
          </div>

          <div
            className={`relative flex items-end gap-2 bg-white/5 border rounded-2xl p-3 transition-colors focus-within:border-purple-500/50 ${
              imageMode ? 'border-purple-500/30' : 'border-white/10'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder={imageMode ? 'Describe the image you want…' : `Message ${model.name}…`}
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-600 resize-none outline-none text-sm leading-relaxed max-h-48 py-1"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                onClick={stop}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors mb-0.5"
              >
                <StopCircle size={16} />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors mb-0.5"
              >
                <Send size={14} />
              </button>
            )}
          </div>
          <p className="text-center text-gray-700 text-[11px]">
            Enter to send · Shift+Enter for new line · Drop files to upload
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ model, onSend }: { model: Model; onSend: (s: string) => void }) {
  const suggestions = [
    'Explain how quantum computing works',
    'Write a professional email template',
    'Create a budget tracking spreadsheet',
    'Generate an image of a futuristic city at sunset',
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto px-4">
      <div className="text-5xl mb-4">{model.icon}</div>
      <h2 className="text-white text-2xl font-semibold mb-2">{model.name}</h2>
      <p className="text-gray-500 text-sm mb-8">{model.description}</p>
      <div className="grid grid-cols-1 gap-2 w-full">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            className="text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-300 text-sm transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, modelIcon }: { message: Message; modelIcon: string }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-purple-600/30 border border-purple-500/20 text-gray-100 rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0 mt-0.5">
        {modelIcon}
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {message.content && (
          <div className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed">
            <MarkdownContent content={message.content} />
          </div>
        )}
        {message.mediaType === 'image' && message.mediaUrl && (
          <GeneratedImage url={message.mediaUrl} />
        )}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const lang = className?.replace('language-', '') ?? '';
          const raw = String(children).trimEnd();

          if (['document', 'spreadsheet', 'slides'].includes(lang)) {
            return <FileBlock lang={lang as 'document' | 'spreadsheet' | 'slides'} content={raw} />;
          }

          const isBlock = !!className;
          if (isBlock) {
            return (
              <pre className="bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto my-3">
                <code className={`${className} text-xs`} {...props}>
                  {children}
                </code>
              </pre>
            );
          }
          return (
            <code className="bg-white/10 rounded px-1.5 py-0.5 text-purple-300 text-xs" {...props}>
              {children}
            </code>
          );
        },
        p({ children }) { return <p className="mb-3 last:mb-0">{children}</p>; },
        ul({ children }) { return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>; },
        h1({ children }) { return <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>; },
        h2({ children }) { return <h2 className="text-base font-semibold mb-2 text-white">{children}</h2>; },
        h3({ children }) { return <h3 className="text-sm font-semibold mb-1 text-white">{children}</h3>; },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-purple-500 pl-3 text-gray-400 italic my-2">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

const FILE_META = {
  document: { icon: '📄', label: 'Word Document (.docx)' },
  spreadsheet: { icon: '📊', label: 'Spreadsheet (.xlsx)' },
  slides: { icon: '📑', label: 'Presentation (.pptx)' },
} as const;

function FileBlock({ lang, content }: { lang: 'document' | 'spreadsheet' | 'slides'; content: string }) {
  const [downloading, setDownloading] = useState(false);
  const meta = FILE_META[lang];

  const download = async () => {
    setDownloading(true);
    try {
      if (lang === 'document') await downloadDocument(content);
      else if (lang === 'spreadsheet') await downloadSpreadsheet(content);
      else await downloadSlides(content);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-3 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </div>
        <button
          onClick={download}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs transition-colors disabled:opacity-50"
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {downloading ? 'Preparing…' : 'Download'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs text-gray-400 max-h-48">
        <code>{content}</code>
      </pre>
    </div>
  );
}

function GeneratedImage({ url }: { url: string }) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  return (
    <div className="mt-2">
      {status === 'loading' && (
        <div className="w-64 h-48 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-xs">Generating…</span>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="text-xs text-red-400">
          Image failed to load.{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
            Open URL directly
          </a>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Generated image"
        referrerPolicy="no-referrer"
        className={`rounded-2xl max-w-md w-full border border-white/10 shadow-xl ${status !== 'done' ? 'hidden' : ''}`}
        onLoad={() => setStatus('done')}
        onError={() => setStatus('error')}
      />
      {status === 'done' && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          Open full size ↗
        </a>
      )}
    </div>
  );
}

async function downloadDocument(content: string, filename = 'document') {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const paragraphs = content.split('\n').map((line) => {
    if (line.startsWith('# ')) {
      return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
    }
    if (line.startsWith('## ')) {
      return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    }
    if (line.startsWith('### ')) {
      return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return new Paragraph({ text: line.slice(2), bullet: { level: 0 } });
    }
    return new Paragraph({ children: [new TextRun(line)] });
  });

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${filename}.docx`);
}

async function downloadSpreadsheet(content: string, filename = 'spreadsheet') {
  const XLSX = await import('xlsx');
  const rows = content.trim().split('\n').map((row) =>
    row.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
  );
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  triggerDownload(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}

async function downloadSlides(content: string, filename = 'presentation') {
  const pptxgenModule = await import('pptxgenjs');
  const PptxGen = pptxgenModule.default;
  const pptx = new PptxGen();
  const slides = content.split(/^---$/m).filter((s) => s.trim());

  for (const slideContent of slides) {
    const slide = pptx.addSlide();
    const lines = slideContent.trim().split('\n').filter((l) => l.trim());
    let titleAdded = false;
    const bodyLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ') && !titleAdded) {
        slide.addText(line.slice(2), {
          x: 0.5, y: 0.5, w: 9, h: 1.2,
          fontSize: 32, bold: true, color: '363636',
        });
        titleAdded = true;
      } else if (line.trim()) {
        bodyLines.push(line.startsWith('- ') ? line.slice(2) : line);
      }
    }

    if (bodyLines.length > 0) {
      slide.addText(bodyLines.join('\n'), {
        x: 0.5, y: 1.9, w: 9, h: 4.5,
        fontSize: 18, valign: 'top', color: '666666',
      });
    }
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
