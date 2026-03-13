"use client";

import { ChatContainer } from "@/components/chat/chat-container";

export default function ChatPage() {
  return (
    <div className="-mx-4 -mt-6 -mb-20 sm:-mx-6 sm:-mt-8 md:-mb-8 lg:-mx-8 h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]">
      <ChatContainer />
    </div>
  );
}
