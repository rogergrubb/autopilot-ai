"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { useChatStore } from "@/stores/chat-store";
import {
  Zap,
  Globe,
  Code,
  Mail,
  FileText,
  Phone,
  Search,
} from "lucide-react";

const SUGGESTED_TASKS = [
  {
    icon: Globe,
    title: "Build me a website",
    description: "Create and deploy a full website for my business",
    prompt: "Build me a professional website for my business. Ask me about my business first.",
  },
  {
    icon: Search,
    title: "Research a topic",
    description: "Deep dive research with a comprehensive report",
    prompt: "I need you to do deep research on a topic and create a comprehensive report. What topic should I research?",
  },
  {
    icon: Mail,
    title: "Manage my emails",
    description: "Draft, send, and organize emails automatically",
    prompt: "Help me manage my email. I need to draft and send professional emails.",
  },
  {
    icon: Code,
    title: "Write & run code",
    description: "Build software, scripts, and automations",
    prompt: "I need you to write some code for me. What should we build?",
  },
  {
    icon: FileText,
    title: "Create a document",
    description: "Write reports, articles, books, or presentations",
    prompt: "Help me create a professional document. What kind of document do you need?",
  },
  {
    icon: Phone,
    title: "Make phone calls",
    description: "AI-powered voice calls on your behalf",
    prompt: "I need you to make a phone call for me. Who should I call and what should I say?",
  },
];

export function ChatArea() {
  const { selectedModel } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (content: string) => {
    sendMessage({ parts: [{ type: "text", text: content }] });
  };

  // Welcome screen (no messages yet)
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-zinc-900">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* Hero */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            What should I do?
          </h1>
          <p className="text-zinc-400 text-center max-w-md mb-10">
            I&apos;m your autonomous AI agent. Give me a goal and I&apos;ll work on it
            independently — using tools, making calls, sending emails, writing
            code, and more.
          </p>

          {/* Suggested Tasks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl w-full">
            {SUGGESTED_TASKS.map((task) => (
              <button
                key={task.title}
                onClick={() => handleSubmit(task.prompt)}
                className="flex items-start gap-3 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-violet-500/30 hover:bg-zinc-800 transition-all text-left group"
              >
                <div className="p-2 rounded-lg bg-zinc-700/50 group-hover:bg-violet-600/20 transition-colors">
                  <task.icon className="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {task.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {task.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    );
  }

  // Active chat
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3 px-4 py-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mx-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              Error: {error.message}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
