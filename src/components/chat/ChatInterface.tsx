'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  Copy,
  Check,
  ArrowDown,
  Wand2,
  Clock,
  Zap,
  RotateCcw,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  {
    icon: '📅',
    title: 'Create a 30-day content calendar',
    prompt: 'Create a 30-day social media content calendar to promote PaperVault.One, SellFast.Now, and BrainCandy.im across Twitter, Instagram, and LinkedIn. Include specific post ideas, hashtags, and optimal posting times.',
  },
  {
    icon: '🧵',
    title: 'Write a viral Twitter thread',
    prompt: 'Write a viral Twitter thread about why organizing your financial documents is the most underrated life hack. Naturally mention PaperVault.One as the solution. Make it relatable and shareable.',
  },
  {
    icon: '📊',
    title: 'Social media strategy audit',
    prompt: 'Analyze the best social media strategy for promoting three different products: a financial document manager (PaperVault.One), a local marketplace (SellFast.Now), and a learning platform (BrainCandy.im). Which platforms should each focus on and why?',
  },
  {
    icon: '🎯',
    title: 'Growth hacking ideas',
    prompt: 'Give me 10 creative growth hacking ideas to get the first 1000 users for SellFast.Now marketplace. Focus on zero-budget and low-budget tactics that can go viral.',
  },
];

// Auto-continue: if Vercel function times out, re-send to pick up.
// Vercel hobby = 60s. We trigger at 55s to beat the hard cutoff.
const TIMEOUT_MS = 55_000;
const MAX_CONTINUES = 3;

export function ChatInterface() {
  const { activeAgent } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Progress tracking
  const [elapsedMs, setElapsedMs] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [continueCount, setContinueCount] = useState(0);
  const [autoContinuing, setAutoContinuing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: {
      agentRole: activeAgent?.role || 'social_strategist',
    },
  }), [activeAgent?.role]);

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    onFinish: () => {
      stopTimer();
      setAutoContinuing(false);
    },
    onError: () => {
      stopTimer();
      setAutoContinuing(false);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Count step-start parts in the latest assistant message for live step counter
  useEffect(() => {
    if (!isLoading) return;
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant?.parts) return;
    const steps = lastAssistant.parts.filter(p => p.type === 'step-start').length;
    setStepCount(steps);
  }, [messages, isLoading]);

  // Timer controls
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // Start/stop timer with loading state; set up auto-continue watchdog
  useEffect(() => {
    if (!isLoading) {
      stopTimer();
      return;
    }
    if (!startTimeRef.current) {
      startTimer();
    }

    // Auto-continue watchdog
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (continueCount < MAX_CONTINUES && isLoading) {
        setAutoContinuing(true);
        stop();
        setTimeout(() => {
          sendMessage({ text: 'Continue from where you left off. Do not repeat anything already said.' });
          setContinueCount(prev => prev + 1);
          startTimer();
        }, 500);
      }
    }, TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, continueCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    setContinueCount(0);
    setStepCount(0);
    setAutoContinuing(false);
    sendMessage({ text: input });
    setInput('');
    startTimer();
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const useSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const formatElapsed = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d14]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {activeAgent && (
            <>
              <span className="text-2xl">{activeAgent.avatar}</span>
              <div>
                <h2 className="text-sm font-semibold text-white">{activeAgent.name}</h2>
                <p className="text-[10px] text-white/40 capitalize flex items-center gap-1">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full inline-block',
                    isLoading ? 'bg-green-400 animate-pulse' : 'bg-white/20'
                  )} />
                  {isLoading ? 'Working...' : activeAgent.role.replace('_', ' ')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Live progress indicators */}
        <div className="flex items-center gap-3">
          {isLoading && (
            <>
              <span className="flex items-center gap-1.5 text-[10px] text-blue-400/80 bg-blue-500/10 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {formatElapsed(elapsedMs)}
              </span>
              {stepCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] text-purple-400/80 bg-purple-500/10 px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3" />
                  Step {stepCount}
                </span>
              )}
              {autoContinuing && (
                <span className="flex items-center gap-1.5 text-[10px] text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full animate-pulse">
                  <RotateCcw className="w-3 h-3" />
                  Auto-continuing ({continueCount}/{MAX_CONTINUES})
                </span>
              )}
            </>
          )}
          <span className="text-[10px] text-white/20 bg-white/5 px-2 py-1 rounded">
            Gemini 2.5 Pro
          </span>
        </div>
      </header>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center mb-6">
              <Wand2 className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">What should we work on?</h2>
            <p className="text-white/40 text-sm mb-8 text-center max-w-md">
              I&apos;m your autonomous social media strategist. I can create content, plan campaigns, and grow your following for PaperVault, SellFast, and BrainCandy.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {SUGGESTED_PROMPTS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => useSuggestion(suggestion.prompt)}
                  className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all text-left group"
                >
                  <span className="text-lg mt-0.5">{suggestion.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      {suggestion.title}
                    </p>
                    <p className="text-[11px] text-white/30 mt-1 line-clamp-2">
                      {suggestion.prompt.slice(0, 80)}...
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => {
              // Hide auto-continue "Continue from where you left off" messages
              const isAutoContinueMsg = message.role === 'user' &&
                message.parts?.some(p => p.type === 'text' && 'text' in p && (p as { text: string }).text.startsWith('Continue from where you left off'));
              if (isAutoContinueMsg) return null;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role !== 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'bg-blue-600/20 border border-blue-500/20 text-white'
                        : 'bg-white/[0.03] border border-white/[0.06] text-white/85'
                    )}
                  >
                    {message.parts?.map((part, i) => {
                      if (part.type === 'text') {
                        return (
                          <div key={i} className="whitespace-pre-wrap">
                            {(part as { text: string }).text}
                          </div>
                        );
                      }
                      if (part.type === 'step-start') {
                        return (
                          <div key={i} className="flex items-center gap-2 my-2 py-1 border-t border-white/5 text-[10px] text-white/30">
                            <Zap className="w-3 h-3 text-purple-400/60" />
                            <span>Next step</span>
                          </div>
                        );
                      }
                      if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                        const toolPart = part as unknown as { type: string; toolCallId: string; toolName?: string; state: string; input?: unknown; output?: unknown };
                        return (
                          <div key={i} className="my-2 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                            <div className="flex items-center gap-2 text-[10px] text-white/40 mb-2">
                              <Sparkles className="w-3 h-3" />
                              <span className="uppercase tracking-wider">{toolPart.toolName || toolPart.type}</span>
                              {toolPart.state === 'result' || toolPart.output ? (
                                <span className="text-green-400">✓ Complete</span>
                              ) : (
                                <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                              )}
                            </div>
                            {toolPart.output !== undefined && (
                              <pre className="text-[11px] text-white/50 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(toolPart.output, null, 2).slice(0, 500)}
                              </pre>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}

                    {(!message.parts || message.parts.length === 0) && (
                      <div className="whitespace-pre-wrap">...</div>
                    )}

                    {message.role !== 'user' && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            const text = message.parts
                              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                              .map(p => p.text)
                              .join('\n') || '';
                            copyMessage(message.id, text);
                          }}
                          className="text-white/20 hover:text-white/60 transition-colors"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-white/60" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading indicator with timer */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-white/40">
                      {autoContinuing ? 'Continuing...' : 'Thinking...'}
                    </span>
                    <span className="text-[10px] text-white/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatElapsed(elapsedMs)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-32 right-8 p-2 rounded-full bg-white/10 border border-white/20 text-white/60 hover:bg-white/20 transition-all"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input Area */}
      <div className="px-4 pb-4 pt-2">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-blue-500/30 transition-colors p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell your agent what to do..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none focus:outline-none px-2 py-1.5 max-h-32 min-h-[36px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={cn(
                'p-2 rounded-lg transition-all',
                input.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'text-white/20'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-2">
            Nova uses Gemini 2.5 Pro · Pipedream MCP for 3000+ app integrations
          </p>
        </form>
      </div>
    </div>
  );
}
