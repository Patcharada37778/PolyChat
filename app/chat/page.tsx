'use client';

import { useState } from 'react';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { ProviderRail } from '@/components/ProviderRail';
import { Conversation } from '@/lib/history';
import { Provider } from '@/lib/models';

export default function ChatPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [provider, setProvider] = useState<Provider>('gemini');

  const handleSelectConversation = (conv: Conversation) => {
    setConversation(conv);
    setProvider(conv.provider ?? 'gemini');
  };

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setConversation(null);
  };

  return (
    <div className="flex h-full">
      <ProviderRail active={provider} onSelect={handleProviderChange} />
      <ChatSidebar
        activeId={conversation?.id}
        onSelect={handleSelectConversation}
        onNew={() => setConversation(null)}
      />
      <main className="flex-1 min-w-0 bg-[#111111]">
        <ChatWindow
          key={`${provider}-${conversation?.id ?? 'new'}`}
          conversation={conversation}
          provider={provider}
          onConversationUpdate={setConversation}
        />
      </main>
    </div>
  );
}
