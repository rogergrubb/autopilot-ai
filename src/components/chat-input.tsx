"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Paperclip, Sparkles } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  isLoading,
  placeholder = "Tell your agent what to do...",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedModel, setSelectedModel } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end bg-zinc-900 rounded-2xl border border-zinc-700 focus-within:border-violet-500/50 transition-colors">
          {/* Input area */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-zinc-500 px-4 py-3.5 resize-none focus:outline-none text-sm max-h-[200px]"
          />

          {/* Actions */}
          <div className="flex items-center gap-1 px-2 pb-2">
            {/* Model selector */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-zinc-800 text-zinc-400 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="gemini">Gemini 2.5 Pro</option>
              <option value="openai">GPT-4o</option>
            </select>

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-2 rounded-lg transition-all",
                input.trim() && !isLoading
                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Sparkles className="w-4 h-4 animate-pulse" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-2">
          Agents can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
