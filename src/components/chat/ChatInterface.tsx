'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { nanoid } from 'nanoid';
import {
  Send,
  Sparkles,
  Leaf,
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

const TIMEOUT_MS = 55_000;
const MAX_CONTINUES = 3;

export function ChatInterface() {
  const { activeAgent, activeChatId, setActiveChatId, setChatHistory, selectedModel } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [chatId, setChatId] = useState<string>(() => nanoid(12));

  const [elapsedMs, setElapsedMs] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [continueCount, setContinueCount] = useState(0);
  const [autoContinuing, setAutoContinuing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveChat = useCallback(async (chatMessages: unknown[]) => {
    try {
      // Auto-generate title from first user message
      const firstUser = chatMessages.find((m: any) => m.role === 'user') as any;
      const title = firstUser?.content?.slice(0, 60) || 'New Chat';

      await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          title,
          agentRole: activeAgent?.role || 'social_strategist',
        }),
      });
      // Refresh chat list in sidebar
      refreshChatList();
    } catch (e) {
      console.error('Failed to save chat:', e);
    }
  }, [chatId, activeAgent?.role]);

  const refreshChatList = useCallback(async () => {
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      setChatHistory(data.chats || []);
    } catch {}
  }, [setChatHistory]);

  // Load chat from sidebar when activeChatId changes
  useEffect(() => {
    if (!activeChatId || activeChatId === chatId) return;
    (async () => {
      try {
        const res = await fetch(`/api/chats/${activeChatId}`);
        const data = await res.json();
        if (data.chat) {
          setChatId(activeChatId);
          // Reset state for the loaded chat — messages will be set via setMessages if available
          // For now, since useChat doesn't expose setMessages in v6, we reload the page
          // This is a limitation we can improve later with a custom message store
          window.location.href = `?chat=${activeChatId}`;
        }
      } catch (e) {
        console.error('Failed to load chat:', e);
      }
    })();
  }, [activeChatId]);

  // Load chat from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlChatId = urlParams.get('chat');
    if (urlChatId) {
      setChatId(urlChatId);
      setActiveChatId(urlChatId);
    }
    refreshChatList();
  }, []);

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: {
      agentRole: activeAgent?.role || 'social_strategist',
      model: selectedModel || 'gemini-2.5-pro',
    },
  }), [activeAgent?.role, selectedModel]);

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    id: chatId,
    onFinish: () => {
      stopTimer();
      setAutoContinuing(false);
      // Auto-save after assistant finishes responding
      setTimeout(() => {
        saveChat(messagesRef.current);
      }, 500);
    },
    onError: () => {
      stopTimer();
      setAutoContinuing(false);
    },
  });

  // Keep a ref to messages for async save
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!isLoading) return;
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant?.parts) return;
    const steps = lastAssistant.parts.filter(p => p.type === 'step-start').length;
    setStepCount(steps);
  }, [messages, isLoading]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    startTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (!isLoading) { stopTimer(); return; }
    if (!startTimeRef.current) startTimer();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (continueCount < MAX_CONTINUES && isLoading) {
        setAutoContinuing(true);
        stop();
        setTimeout(() => {
          sendMessage({ text: 'You were interrupted by a timeout. Before continuing, use selfReflect to evaluate your progress so far — what have you completed, what gaps remain, and what should you do next. Then continue executing.' });
          setContinueCount(prev => prev + 1);
          startTimer();
        }, 500);
      }
    }, TIMEOUT_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, continueCount]);

  useEffect(() => { return () => { stopTimer(); }; }, [stopTimer]);

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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const useSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const formatElapsed = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 border-b bg-white/80 backdrop-blur-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {activeAgent && (
            <>
              <span className="text-xl md:text-2xl">{activeAgent.avatar}</span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[#1a1a1a] truncate">{activeAgent.name}</h2>
                <p className="text-[10px] text-[#8a8478] capitalize flex items-center gap-1">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full inline-block',
                    isLoading ? 'bg-[#2d8a4e] animate-pulse' : 'bg-[#d4cec2]'
                  )} />
                  {isLoading ? 'Working...' : activeAgent.role.replace('_', ' ')}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          {isLoading && (
            <>
              <span className="flex items-center gap-1.5 text-[10px] text-[#2d8a4e] bg-[#e8f5ec] px-2 md:px-2.5 py-1 rounded-full font-medium">
                <Clock className="w-3 h-3" />
                {formatElapsed(elapsedMs)}
              </span>
              {stepCount > 0 && (
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full font-medium">
                  <Zap className="w-3 h-3" />
                  Step {stepCount}
                </span>
              )}
              {autoContinuing && (
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse font-medium">
                  <RotateCcw className="w-3 h-3" />
                  Auto-continuing ({continueCount}/{MAX_CONTINUES})
                </span>
              )}
            </>
          )}
          <span className="hidden sm:inline text-[10px] text-[#b5ae9e] bg-[#f0ece4] px-2 py-1 rounded font-medium">
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
            <div className="w-16 h-16 rounded-2xl bg-[#e8f5ec] border border-[#c8e6c9] flex items-center justify-center mb-6">
              <Wand2 className="w-8 h-8 text-[#2d8a4e]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">What should we work on?</h2>
            <p className="text-[#8a8478] text-sm mb-8 text-center max-w-md">
              I&apos;m your autonomous AI agent. I can research, browse the web, create content, generate images, and connect to 3000+ apps.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {SUGGESTED_PROMPTS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => useSuggestion(suggestion.prompt)}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:bg-[#f5f2ed] hover:border-[#d4cec2] transition-all text-left group shadow-sm"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-lg mt-0.5">{suggestion.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a] group-hover:text-[#2d8a4e] transition-colors">
                      {suggestion.title}
                    </p>
                    <p className="text-[11px] text-[#b5ae9e] mt-1 line-clamp-2">
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
              const isAutoContinueMsg = message.role === 'user' &&
                message.parts?.some(p => p.type === 'text' && 'text' in p && (p as { text: string }).text.startsWith('Continue from where you left off'));
              if (isAutoContinueMsg) return null;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3 animate-fade-in',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role !== 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-[#e8f5ec] border border-[#c8e6c9] flex items-center justify-center shrink-0 mt-1">
                      <Leaf className="w-4 h-4 text-[#2d8a4e]" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[90%] md:max-w-[80%] rounded-2xl px-3 md:px-4 py-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'bg-[#2d8a4e] text-white shadow-sm'
                        : 'bg-white border shadow-sm text-[#1a1a1a]'
                    )}
                    style={message.role !== 'user' ? { borderColor: 'var(--border)' } : undefined}
                  >
                    {message.parts?.map((part, i) => {
                      if (part.type === 'text') {
                        return (
                          <div key={i} className="whitespace-pre-wrap prose-agent">
                            {(part as { text: string }).text}
                          </div>
                        );
                      }
                      if (part.type === 'step-start') {
                        return (
                          <div key={i} className="flex items-center gap-2 my-2 py-1 border-t text-[10px] text-[#b5ae9e]" style={{ borderColor: 'var(--border)' }}>
                            <Zap className="w-3 h-3 text-purple-400" />
                            <span>Next step</span>
                          </div>
                        );
                      }
                      if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
                        const toolPart = part as unknown as { type: string; toolCallId: string; toolName?: string; state: string; input?: unknown; output?: unknown };
                        const isReflection = toolPart.toolName === 'selfReflect';
                        const isPlan = toolPart.toolName === 'planNextSteps';
                        const isNotification = toolPart.toolName === 'sendNotification';
                        const isPhoneCall = toolPart.toolName === 'makePhoneCall';
                        const isTaskLaunch = toolPart.toolName === 'createAutonomousTask';
                        const isTaskCheck = toolPart.toolName === 'checkTaskStatus';
                        const isSpecial = isReflection || isPlan || isNotification || isPhoneCall || isTaskLaunch || isTaskCheck;

                        // Special rendering for reasoning and notification tools
                        if (isSpecial && toolPart.output) {
                          const output = toolPart.output as Record<string, unknown>;

                          if (isNotification) {
                            return (
                              <div key={i} className="my-2 p-3 rounded-lg border-l-4 border-l-amber-400 border border-amber-100" style={{ backgroundColor: '#fffbeb' }}>
                                <div className="flex items-center gap-2 text-[10px] text-amber-700 font-medium">
                                  <span>🔔</span>
                                  <span className="uppercase tracking-wider">Notification Sent</span>
                                  {output.sent ? (
                                    <span className="text-green-600 ml-auto">✓</span>
                                  ) : (
                                    <span className="text-red-500 ml-auto">✗</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-amber-800 mt-1">{String(output.message || '')}</p>
                              </div>
                            );
                          }

                          if (isPhoneCall) {
                            return (
                              <div key={i} className="my-2 p-3 rounded-lg border-l-4 border-l-green-400 border border-green-100" style={{ backgroundColor: '#f0fdf4' }}>
                                <div className="flex items-center gap-2 text-[10px] text-green-700 font-medium">
                                  <span>📞</span>
                                  <span className="uppercase tracking-wider">Phone Call</span>
                                  {output.success ? (
                                    <span className="text-green-600 ml-auto">✓ Initiated</span>
                                  ) : (
                                    <span className="text-red-500 ml-auto">✗ Failed</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-green-800 mt-1">
                                  {output.success
                                    ? `Calling ${String(output.to || '')} — the recipient will hear your message via AI voice.`
                                    : String(output.error || 'Call failed')
                                  }
                                </p>
                              </div>
                            );
                          }

                          if (isTaskLaunch) {
                            return (
                              <div key={i} className="my-2 p-3 rounded-lg border-l-4 border-l-indigo-400 border border-indigo-100" style={{ backgroundColor: '#eef2ff' }}>
                                <div className="flex items-center gap-2 text-[10px] text-indigo-700 font-medium">
                                  <span>🚀</span>
                                  <span className="uppercase tracking-wider">Autonomous Task</span>
                                  {output.launched ? (
                                    <span className="text-indigo-600 ml-auto">✓ Launched</span>
                                  ) : (
                                    <span className="text-red-500 ml-auto">✗ Failed</span>
                                  )}
                                </div>
                                {output.launched ? (
                                  <div className="mt-1">
                                    <p className="text-[11px] font-medium text-indigo-900">{String(output.title || '')}</p>
                                    <p className="text-[10px] text-indigo-600 mt-0.5">Working autonomously in background — you&apos;ll get a notification when done.</p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-red-600 mt-1">{String(output.error || 'Launch failed')}</p>
                                )}
                              </div>
                            );
                          }

                          if (isTaskCheck) {
                            return (
                              <div key={i} className="my-2 p-3 rounded-lg border-l-4 border-l-indigo-400 border border-indigo-100" style={{ backgroundColor: '#eef2ff' }}>
                                <div className="flex items-center gap-2 text-[10px] text-indigo-700 font-medium">
                                  <span>📋</span>
                                  <span className="uppercase tracking-wider">Task Status</span>
                                  <span className="ml-auto text-[11px]">{String(output.status || 'unknown')}</span>
                                </div>
                                {output.found ? (
                                  <div className="mt-1 text-[11px] text-indigo-800">
                                    <p className="font-medium">{String(output.title || '')}</p>
                                    <p className="text-[10px] text-indigo-600">{String(output.progress || '')}</p>
                                    {Array.isArray(output.steps) && (
                                      <div className="mt-1.5 space-y-0.5">
                                        {(output.steps as Array<{ step: number; title: string; status: string }>).map((s, si) => (
                                          <div key={si} className="flex items-center gap-1.5 text-[10px]">
                                            <span>{s.status === 'completed' ? '✅' : s.status === 'running' ? '⏳' : s.status === 'failed' ? '❌' : '⬜'}</span>
                                            <span className={s.status === 'completed' ? 'text-indigo-800' : 'text-indigo-400'}>{s.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-red-600 mt-1">{String(output.error || 'Task not found')}</p>
                                )}
                              </div>
                            );
                          }

                          if (isReflection) {
                            const reflection = output.reflection as Record<string, unknown> | undefined;
                            return (
                              <div key={i} className="my-2 p-3 rounded-lg border-l-4 border-l-purple-400 border border-purple-100" style={{ backgroundColor: '#faf5ff' }}>
                                <div className="flex items-center gap-2 text-[10px] text-purple-600 mb-2 font-medium">
                                  <RotateCcw className="w-3 h-3" />
                                  <span className="uppercase tracking-wider">Self-Reflection</span>
                                  {reflection?.confidence !== undefined && (
                                    <span className="ml-auto text-[11px] font-bold">{String(reflection.confidence)}% confident</span>
                                  )}
                                </div>
                                {reflection && (
                                  <div className="text-[11px] text-purple-800 space-y-1">
                                    <p><strong>Quality:</strong> {String(reflection.quality)}</p>
                                    <p><strong>Steps done:</strong> {String(reflection.stepsCompleted)}</p>
                                    {Array.isArray(reflection.gaps) && reflection.gaps.length > 0 && (
                                      <p><strong>Gaps:</strong> {reflection.gaps.join(', ')}</p>
                                    )}
                                    <p><strong>Next:</strong> {String(reflection.nextAction)}</p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          if (isPlan) {
                            const plan = output.plan as Record<string, unknown> | undefined;
                            const steps = plan?.steps as Array<Record<string, unknown>> | undefined;
                            return (
                              <div key={i} className="my-2 p-3 rounded-lg border-l-4 border-l-blue-400 border border-blue-100" style={{ backgroundColor: '#f0f7ff' }}>
                                <div className="flex items-center gap-2 text-[10px] text-blue-600 mb-2 font-medium">
                                  <Clock className="w-3 h-3" />
                                  <span className="uppercase tracking-wider">Execution Plan</span>
                                  {plan?.complexity != null && (
                                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-100 text-[9px]">{String(plan.complexity)}</span>
                                  )}
                                </div>
                                {steps && (
                                  <div className="text-[11px] text-blue-800 space-y-0.5">
                                    {steps.map((step, si) => (
                                      <div key={si} className="flex items-start gap-1.5">
                                        <span className="text-blue-400 font-mono flex-shrink-0">{String(step.order)}.</span>
                                        <span>{String(step.action)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        }

                        // Default tool rendering
                        return (
                          <div key={i} className="my-2 p-3 rounded-lg border" style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-2 text-[10px] text-[#8a8478] mb-2">
                              <Sparkles className="w-3 h-3" />
                              <span className="uppercase tracking-wider font-medium">{toolPart.toolName || toolPart.type}</span>
                              {toolPart.state === 'result' || toolPart.output ? (
                                <span className="text-[#2d8a4e] font-medium">✓ Complete</span>
                              ) : (
                                <Loader2 className="w-3 h-3 animate-spin text-[#2d8a4e]" />
                              )}
                            </div>
                            {toolPart.output !== undefined && (
                              <pre className="text-[11px] text-[#8a8478] overflow-x-auto whitespace-pre-wrap">
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
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={() => {
                            const text = message.parts
                              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                              .map(p => p.text)
                              .join('\n') || '';
                            copyMessage(message.id, text);
                          }}
                          className="text-[#d4cec2] hover:text-[#8a8478] transition-colors"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-[#2d8a4e]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-[#f0ece4] border border-[#e5e0d8] flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-[#8a8478]" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-[#e8f5ec] border border-[#c8e6c9] flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-[#2d8a4e]" />
                </div>
                <div className="bg-white border rounded-2xl px-4 py-3 shadow-sm" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2d8a4e]" />
                    <span className="text-sm text-[#8a8478]">
                      {autoContinuing ? 'Continuing...' : 'Thinking...'}
                    </span>
                    <span className="text-[10px] text-[#b5ae9e] flex items-center gap-1">
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
          className="absolute bottom-32 right-8 p-2 rounded-full bg-white border shadow-md text-[#8a8478] hover:text-[#1a1a1a] transition-all"
          style={{ borderColor: 'var(--border)' }}
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input Area */}
      <div className="px-4 pb-4 pt-2">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="flex items-end gap-2 rounded-2xl border bg-white focus-within:border-[#2d8a4e]/40 focus-within:shadow-md transition-all p-2 shadow-sm" style={{ borderColor: 'var(--border)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell your agent what to do..."
              rows={1}
              className="flex-1 bg-transparent text-[#1a1a1a] text-sm placeholder:text-[#b5ae9e] resize-none focus:outline-none px-2 py-1.5 max-h-32 min-h-[36px]"
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
                  ? 'bg-[#2d8a4e] text-white hover:bg-[#247a42] shadow-sm'
                  : 'text-[#d4cec2]'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-[#b5ae9e] mt-2">
            <span className="hidden sm:inline">Powered by Gemini 2.5 Pro · Deep Research · Web Browser · 3000+ App Integrations</span>
            <span className="sm:hidden">Gemini 2.5 Pro · 3000+ Apps</span>
          </p>
        </form>
      </div>
    </div>
  );
}
