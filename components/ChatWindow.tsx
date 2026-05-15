'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Message } from '@/types';
import { Model, models, getModel, Provider } from '@/lib/models';
import { Conversation, saveConversation } from '@/lib/history';
import { getProviderTheme, ProviderTheme } from '@/lib/providerThemes';
import { useAccent } from '@/lib/accent';
import {
  Send, StopCircle, BookOpen, Loader2, Image as ImageIcon,
  ChevronDown, Paperclip, Download, Mic,
  Copy, Check, Volume2, VolumeX,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { DocumentPanel } from './DocumentPanel';

interface Props {
  conversation: Conversation | null;
  provider: Provider;
  onConversationUpdate: (conv: Conversation) => void;
}

export function ChatWindow({ conversation, provider, onConversationUpdate }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? '';
  const accentHex = useAccent();
  const theme = getProviderTheme(provider, accentHex);

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
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const convIdRef = useRef<string>(conversation?.id ?? crypto.randomUUID());
  const convCreatedAtRef = useRef<string>(conversation?.createdAt ?? new Date().toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [conversation?.id]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

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

  const toggleMic = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = detectScriptLang(input) || navigator.languages?.[0] || navigator.language || 'en-US';
    rec.onresult = (e: { results: { [x: number]: { [x: number]: { transcript: string } } } }) => {
      const t = e.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${t}` : t));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 200) + 'px';
        }
      });
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }, [isListening]);

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
      saveConversation(conv, userId);
      window.dispatchEvent(new Event('aion:history'));
      onConversationUpdate(conv);
    },
    [onConversationUpdate, provider, userId],
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
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
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `✅ Document **"${file.name}"** uploaded (${data.chunkCount} chunks). I'll use it as context for our conversation.`,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `⚠️ Failed to upload "${file.name}": ${err instanceof Error ? err.message : 'Upload failed'}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const isEmpty = messages.length === 0;
  const textareaBorderColor = textareaFocused ? theme.textareaBorderFocus : 'transparent';

  return (
    <div className="flex flex-col h-full relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {isDragging && (
        <div className="absolute inset-0 z-50 border-2 border-dashed rounded-lg pointer-events-none flex items-center justify-center"
          style={{ background: `${theme.primaryColor}18`, borderColor: `${theme.primaryColor}80` }}>
          <div className="flex flex-col items-center gap-2" style={{ color: theme.dotColor }}>
            <Paperclip size={32} />
            <span className="text-lg font-medium">Drop file to upload</span>
          </div>
        </div>
      )}

      {showDocs && <DocumentPanel onClose={() => setShowDocs(false)} onDocsChange={setDocCount} />}

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <EmptyState model={model} theme={theme} onSend={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} modelIcon={model.icon} theme={theme} />
            ))}
            {isThinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'var(--ui-bg-card)' }}>
                  {model.icon}
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.dotColor, animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.dotColor, animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.dotColor, animationDelay: '300ms' }} />
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
            {/* Model picker */}
            <div className="relative" ref={modelPickerRef}>
              <button
                onClick={() => setShowModelPicker((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'var(--ui-bg-card)', color: 'var(--ui-text-2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
              >
                <span>{model.icon}</span>
                <span>{model.name}</span>
                <ChevronDown size={13} className={`transition-transform ${showModelPicker ? 'rotate-180' : ''}`} />
              </button>
              {showModelPicker && (
                <div className="absolute bottom-full mb-2 left-0 rounded-xl border shadow-xl overflow-hidden min-w-48 z-20"
                  style={{ background: 'var(--ui-bg-sidebar)', borderColor: 'var(--ui-border)' }}>
                  {models.map((m) => (
                    <button key={m.id}
                      onClick={() => { setModelId(m.id); setShowModelPicker(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
                      style={{ color: modelId === m.id ? 'var(--ui-text-1)' : 'var(--ui-text-2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>{m.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs" style={{ color: 'var(--ui-text-3)' }}>{m.description}</p>
                      </div>
                      {modelId === m.id && <span className="text-xs" style={{ color: theme.primaryColor }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image mode */}
            <button
              onClick={() => setImageMode((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={imageMode ? {
                background: theme.imageActiveBg, color: theme.imageActiveColor,
                border: `1px solid ${theme.imageActiveBorder}`,
              } : { background: 'var(--ui-bg-card)', color: 'var(--ui-text-3)', border: '1px solid transparent' }}
              onMouseEnter={(e) => { if (!imageMode) e.currentTarget.style.background = 'var(--ui-bg-card-hover)'; }}
              onMouseLeave={(e) => { if (!imageMode) e.currentTarget.style.background = 'var(--ui-bg-card)'; }}
            >
              <ImageIcon size={13} />
              <span>Image</span>
            </button>

            {/* Docs */}
            <button
              onClick={() => setShowDocs(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={docCount > 0 ? { background: theme.docsActiveBg, color: theme.docsActiveColor }
                : { background: 'var(--ui-bg-card)', color: 'var(--ui-text-3)' }}
              onMouseEnter={(e) => { if (!docCount) e.currentTarget.style.background = 'var(--ui-bg-card-hover)'; }}
              onMouseLeave={(e) => { if (!docCount) e.currentTarget.style.background = 'var(--ui-bg-card)'; }}
            >
              <BookOpen size={13} />
              <span>Docs{docCount > 0 ? ` (${docCount})` : ''}</span>
            </button>

            {uploadingFile && (
              <div className="flex items-center gap-1.5 text-xs ml-auto" style={{ color: 'var(--ui-text-3)' }}>
                <Loader2 size={12} className="animate-spin" />Uploading…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="relative flex items-end gap-2 rounded-2xl p-3 transition-colors border"
            style={{ background: 'var(--ui-input-bg)', borderColor: textareaBorderColor }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              placeholder={imageMode ? 'Describe the image you want…' : isListening ? 'Listening…' : `Message ${model.name}…`}
              rows={1}
              className="flex-1 bg-transparent placeholder-gray-500 resize-none outline-none text-sm leading-relaxed max-h-48 py-1"
              style={{ color: 'var(--ui-text-1)' }}
              disabled={isStreaming}
            />

            {/* Mic */}
            <button
              onClick={toggleMic}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-colors mb-0.5"
              style={{
                color: isListening ? theme.primaryColor : 'var(--ui-text-3)',
                background: isListening ? theme.imageActiveBg : 'transparent',
              }}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              <Mic size={15} />
            </button>

            {isStreaming ? (
              <button onClick={stop}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors mb-0.5">
                <StopCircle size={16} />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors mb-0.5"
                style={{ background: theme.primaryColor }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.primaryHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = theme.primaryColor; }}
              >
                <Send size={14} />
              </button>
            )}
          </div>
          <p className="text-center text-[11px]" style={{ color: 'var(--ui-text-3)' }}>
            Enter to send · Shift+Enter for new line · Drop files to upload
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ model, theme, onSend }: { model: Model; theme: ProviderTheme; onSend: (s: string) => void }) {
  const suggestions = [
    'Explain how quantum computing works',
    'Write a professional email template',
    'Create a budget tracking spreadsheet',
    'Generate an image of a futuristic city at sunset',
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto px-4">
      <div className="text-5xl mb-4">{model.icon}</div>
      <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--ui-text-1)' }}>{model.name}</h2>
      <p className="text-sm mb-8" style={{ color: 'var(--ui-text-3)' }}>{model.description}</p>
      <div className="grid grid-cols-1 gap-2 w-full">
        {suggestions.map((s) => (
          <button key={s} onClick={() => onSend(s)}
            className="text-left px-4 py-3 rounded-xl text-sm transition-colors border"
            style={{ background: 'var(--ui-bg-card)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
          >{s}</button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, modelIcon, theme }: { message: Message; modelIcon: string; theme: ProviderTheme }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] border rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: theme.userBubbleBg, borderColor: theme.userBubbleBorder, color: 'var(--ui-text-1)' }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
        style={{ background: 'var(--ui-bg-card)' }}>
        {modelIcon}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {message.content && (
          <div className="prose prose-sm max-w-none leading-relaxed" style={{ color: 'var(--ui-prose)' }}>
            <MarkdownContent content={message.content} theme={theme} />
          </div>
        )}
        {message.mediaType === 'image' && message.mediaUrl && (
          <GeneratedImage url={message.mediaUrl} theme={theme} />
        )}
        {/* Copy + TTS actions (only when message is complete) */}
        {message.content && (
          <MessageActions content={message.content} theme={theme} />
        )}
      </div>
    </div>
  );
}

function MessageActions({ content, theme }: { content: string; theme: ProviderTheme }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopy = async () => {
    const plainText = content.replace(/```[\s\S]*?```/g, '[code]').replace(/[#*`_~]/g, '');
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const plain = content
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .trim();
    const utterance = new SpeechSynthesisUtterance(plain);

    // Set a language hint for non-Latin scripts we can reliably detect.
    // For Latin-script text (French, German, Spanish, English…) we leave
    // utterance.lang unset so the browser uses its own best natural voice.
    // utterance.voice is never forced — the browser picks the best voice for
    // the language automatically.
    const scriptLang = detectScriptLang(plain);
    if (scriptLang) utterance.lang = scriptLang;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className="flex items-center gap-1 pt-1">
      <button onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
        style={{ color: copied ? theme.primaryColor : 'var(--ui-text-3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <button onClick={handleSpeak}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
        style={{ color: speaking ? theme.primaryColor : 'var(--ui-text-3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ui-bg-card)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
        <span>{speaking ? 'Stop' : 'Speak'}</span>
      </button>
    </div>
  );
}

function CodeCopyButton({ content, theme }: { content: string; theme: ProviderTheme }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
      style={{ color: copied ? theme.primaryColor : '#9ca3af' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function MarkdownContent({ content, theme }: { content: string; theme: ProviderTheme }) {
  return (
    <ReactMarkdown
      components={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code({ className, children, ...props }: any) {
          const lang = className?.replace('language-', '') ?? '';
          const raw = String(children).trimEnd();

          if (['document', 'spreadsheet', 'slides', 'pdf'].includes(lang)) {
            return <FileBlock lang={lang as 'document' | 'spreadsheet' | 'slides' | 'pdf'} content={raw} theme={theme} />;
          }

          if (className) {
            return (
              <div className="my-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between px-4 py-1.5" style={{ background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[11px] font-mono" style={{ color: '#9ca3af' }}>{lang || 'code'}</span>
                  <CodeCopyButton content={raw} theme={theme} />
                </div>
                <SyntaxHighlighter
                  language={lang || 'text'}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  style={vscDarkPlus as any}
                  customStyle={{ margin: 0, borderRadius: 0, padding: '16px', fontSize: '13px', background: '#1e1e2e' }}
                  PreTag="div"
                >
                  {raw}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code className="rounded px-1.5 py-0.5 text-xs font-mono"
              style={{ background: 'var(--ui-code-bg)', color: theme.codeColor }} {...props}>
              {children}
            </code>
          );
        },
        strong({ children }) { return <strong style={{ color: 'var(--ui-text-1)', fontWeight: 700 }}>{children}</strong>; },
        p({ children }) { return <p className="mb-3 last:mb-0">{children}</p>; },
        ul({ children }) { return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>; },
        h1({ children }) { return <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--ui-text-1)' }}>{children}</h1>; },
        h2({ children }) { return <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--ui-text-1)' }}>{children}</h2>; },
        h3({ children }) { return <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--ui-text-1)' }}>{children}</h3>; },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 pl-3 italic my-2"
              style={{ borderColor: theme.blockquoteBorder, color: 'var(--ui-text-3)' }}>
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
  document:    { icon: '📄', label: 'Word Document (.docx)' },
  spreadsheet: { icon: '📊', label: 'Spreadsheet (.xlsx)' },
  slides:      { icon: '📑', label: 'Presentation (.pptx)' },
  pdf:         { icon: '📋', label: 'PDF Document (.pdf)' },
} as const;

function FileBlock({ lang, content, theme }: {
  lang: 'document' | 'spreadsheet' | 'slides' | 'pdf';
  content: string;
  theme: ProviderTheme;
}) {
  const [downloading, setDownloading] = useState(false);
  const meta = FILE_META[lang];

  const download = async () => {
    setDownloading(true);
    try {
      if (lang === 'document') await downloadDocument(content);
      else if (lang === 'spreadsheet') await downloadSpreadsheet(content);
      else if (lang === 'slides') await downloadSlides(content);
      else await downloadPDF(content);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--ui-border)' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: 'var(--ui-bg-card)', borderColor: 'var(--ui-border)' }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text-2)' }}>
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </div>
        <button onClick={download} disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-opacity disabled:opacity-50"
          style={{ background: theme.downloadBtnBg, color: theme.downloadBtnColor }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {downloading ? 'Preparing…' : 'Download'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs max-h-48" style={{ color: 'var(--ui-text-3)' }}>
        <code>{content}</code>
      </pre>
    </div>
  );
}

function GeneratedImage({ url, theme }: { url: string; theme: ProviderTheme }) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  return (
    <div className="mt-2">
      {status === 'loading' && (
        <div className="w-64 h-48 rounded-2xl border flex items-center justify-center"
          style={{ background: 'var(--ui-bg-card)', borderColor: 'var(--ui-border)' }}>
          <div className="flex flex-col items-center gap-2" style={{ color: 'var(--ui-text-3)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-xs">Generating…</span>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="text-xs text-red-400">
          Image failed to load.{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">Open URL directly</a>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Generated image" referrerPolicy="no-referrer"
        className={`rounded-2xl max-w-md w-full border shadow-xl ${status !== 'done' ? 'hidden' : ''}`}
        style={{ borderColor: 'var(--ui-border)' }}
        onLoad={() => setStatus('done')} onError={() => setStatus('error')}
      />
      {status === 'done' && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-block mt-2 text-xs transition-opacity hover:opacity-70"
          style={{ color: theme.primaryColor }}>
          Open full size ↗
        </a>
      )}
    </div>
  );
}

async function downloadDocument(content: string, filename = 'document') {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const paragraphs = content.split('\n').map((line) => {
    if (line.startsWith('# ')) return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
    if (line.startsWith('## ')) return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    if (line.startsWith('### ')) return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
    if (line.startsWith('- ') || line.startsWith('* ')) return new Paragraph({ text: line.slice(2), bullet: { level: 0 } });
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
        slide.addText(line.slice(2), { x: 0.5, y: 0.5, w: 9, h: 1.2, fontSize: 32, bold: true, color: '363636' });
        titleAdded = true;
      } else if (line.trim()) {
        bodyLines.push(line.startsWith('- ') ? line.slice(2) : line);
      }
    }
    if (bodyLines.length > 0) {
      slide.addText(bodyLines.join('\n'), { x: 0.5, y: 1.9, w: 9, h: 4.5, fontSize: 18, valign: 'top', color: '666666' });
    }
  }
  await pptx.writeFile({ fileName: `${filename}.pptx` });
}

async function downloadPDF(content: string, filename = 'document') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  const lh = 7;

  for (const line of content.split('\n')) {
    if (y > 275) { doc.addPage(); y = margin; }
    if (line.startsWith('# ')) {
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text(line.slice(2), margin, y); y += lh * 1.8;
    } else if (line.startsWith('## ')) {
      doc.setFontSize(15); doc.setFont('helvetica', 'bold');
      doc.text(line.slice(3), margin, y); y += lh * 1.5;
    } else if (line.startsWith('### ')) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text(line.slice(4), margin, y); y += lh * 1.3;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(`• ${line.slice(2)}`, maxWidth - 5);
      doc.text(wrapped, margin + 3, y); y += lh * wrapped.length;
    } else if (line.trim() === '') {
      y += lh * 0.5;
    } else {
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      const clean = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
      const wrapped = doc.splitTextToSize(clean, maxWidth);
      doc.text(wrapped, margin, y); y += lh * wrapped.length;
    }
  }
  doc.save(`${filename}.pdf`);
}

/** Detect language from Unicode character ranges. Returns BCP-47 tag or '' for Latin scripts. */
function detectScriptLang(text: string): string {
  if (/[฀-๿]/.test(text)) return 'th-TH';                 // Thai
  if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja-JP';     // Japanese kana
  if (/[一-鿿㐀-䶿]/.test(text)) return 'zh-CN';     // CJK Unified
  if (/[가-힯]/.test(text)) return 'ko-KR';                  // Korean hangul
  if (/[؀-ۿ]/.test(text)) return 'ar-SA';                  // Arabic
  if (/[ऀ-ॿ]/.test(text)) return 'hi-IN';                  // Devanagari (Hindi)
  if (/[Ѐ-ӿ]/.test(text)) return 'ru-RU';                  // Cyrillic
  if (/[Ͱ-Ͽ]/.test(text)) return 'el-GR';                  // Greek
  if (/[ঀ-৿]/.test(text)) return 'bn-BD';                  // Bengali
  if (/[஀-௿]/.test(text)) return 'ta-IN';                  // Tamil
  if (/[ಀ-೿]/.test(text)) return 'kn-IN';                  // Kannada
  if (/[ഀ-ൿ]/.test(text)) return 'ml-IN';                  // Malayalam
  if (/[਀-੿]/.test(text)) return 'pa-IN';                  // Gurmukhi (Punjabi)
  if (/[଀-୿]/.test(text)) return 'or-IN';                  // Odia
  if (/[઀-૿]/.test(text)) return 'gu-IN';                  // Gujarati
  if (/[ༀ-࿿]/.test(text)) return 'bo-CN';                  // Tibetan
  if (/[֐-׿]/.test(text)) return 'he-IL';                  // Hebrew
  if (/[܀-ݏ]/.test(text)) return 'syr';                    // Syriac
  if (/[Ⴀ-ჿ]/.test(text)) return 'ka-GE';                  // Georgian
  if (/[԰-֏]/.test(text)) return 'hy-AM';                  // Armenian
  return '';
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
