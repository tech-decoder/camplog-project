"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_urls: string[];
  extracted_changes?: Array<{
    campaign_name: string;
    site?: string;
    action_type: string;
    geo: string | null;
    change_value: string | null;
    description: string;
    confidence: number;
    id?: string;
  }>;
  created_at: string;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages() {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }

  async function handleSend(content: string, images: File[]) {
    // Create optimistic user message
    const imagePreviewUrls = images.map((f) => URL.createObjectURL(f));
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      image_urls: imagePreviewUrls,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("content", content);
      images.forEach((img) => formData.append("images", img));

      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process message");
      }

      const data = await res.json();

      // Replace optimistic message with real one and add assistant response
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== userMsg.id);
        return [
          ...withoutTemp,
          {
            id: data.userMessage.id,
            role: "user" as const,
            content: data.userMessage.content,
            image_urls: data.userMessage.image_urls || [],
            created_at: data.userMessage.created_at,
          },
          {
            id: data.assistantMessage.id,
            role: "assistant" as const,
            content: data.assistantMessage.content,
            image_urls: [],
            extracted_changes: data.extractedChanges || [],
            created_at: data.assistantMessage.created_at,
          },
        ];
      });
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I had trouble processing that. Please try again.",
          image_urls: [],
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }

  const starters = [
    "Decreased MBM US spend by 25%",
    "Paused GKB campaign in PR",
    "Increasing NASI budget by 30% in CA",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to CampLog</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Log campaign changes by typing or pasting screenshots.
              I&apos;ll extract the data and track everything for you.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {starters.map((text) => (
                <Button
                  key={text}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(text, [])}
                  disabled={isProcessing}
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
                Processing...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isProcessing} />
    </div>
  );
}
