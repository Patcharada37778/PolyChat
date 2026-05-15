'use client';

import { useState } from 'react';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { Conversation } from '@/lib/history';

export default function ChatPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);

  return (
    <div className="flex h-full">
      <ChatSidebar
        activeId={conversation?.id}
        onSelect={setConversation}
        onNew={() => setConversation(null)}
      />
      <main className="flex-1 min-w-0 bg-[#111111]">
        <ChatWindow
          key={conversation?.id ?? 'new'}
          conversation={conversation}
          onConversationUpdate={setConversation}
        />
      </main>
    </div>
  );
}
