'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, MessageSquare, Trash2, Leaf } from 'lucide-react';

const productColors: Record<string, string> = {
  papervault: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sellfast: 'bg-orange-50 text-orange-700 border-orange-200',
  braincandy: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, agents, activeAgent, setActiveAgent, chatHistory, setChatHistory, activeChatId, setActiveChatId } = useAppStore();

  // Fetch chat history on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/chats');
        const data = await res.json();
        setChatHistory(data.chats || []);
      } catch {}
    })();
  }, [setChatHistory]);

  const deleteChat = async (id: string) => {
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      setChatHistory(chatHistory.filter(c => c.id !== id));
      if (activeChatId === id) {
        setActiveChatId(null);
        window.location.href = '/';
      }
    } catch {}
  };

  const startNewChat = () => {
    setActiveChatId(null);
    window.location.href = '/';
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r transition-all duration-300',
        sidebarOpen ? 'w-72' : 'w-16'
      )}
      style={{ 
        backgroundColor: 'var(--sidebar-bg)', 
        borderColor: 'var(--sidebar-border)' 
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        {sidebarOpen && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2d8a4e] flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#1a1a1a]">DoAnything</h1>
              <p className="text-[10px] text-[#8a8478]">by NumberOneSon</p>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-black/5 text-[#8a8478] hover:text-[#1a1a1a] transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button onClick={startNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#2d8a4e] hover:bg-[#247a42] text-white transition-all text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" />
          {sidebarOpen && <span>New Chat</span>}
        </button>
      </div>

      {sidebarOpen && (
        <>
          {/* Agents */}
          <div className="px-3 mt-2">
            <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-2 font-medium">Agents</p>
            <div className="space-y-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                    activeAgent?.id === agent.id
                      ? 'bg-white text-[#1a1a1a] shadow-sm border border-[#e5e0d8]'
                      : 'text-[#8a8478] hover:bg-white/60 hover:text-[#1a1a1a]'
                  )}
                >
                  <span className="text-lg">{agent.avatar}</span>
                  <div className="text-left">
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-[10px] text-[#b5ae9e] capitalize">{agent.role.replace('_', ' ')}</p>
                  </div>
                  <div
                    className={cn(
                      'ml-auto w-2 h-2 rounded-full',
                      agent.status === 'working' ? 'bg-[#2d8a4e] animate-pulse' : 'bg-[#d4cec2]'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="px-3 mt-6">
            <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-2 font-medium">Promoting</p>
            <div className="space-y-1">
              {[
                { name: 'PaperVault.One', slug: 'papervault', icon: '📄' },
                { name: 'SellFast.Now', slug: 'sellfast', icon: '🏷️' },
                { name: 'BrainCandy.im', slug: 'braincandy', icon: '🧠' },
              ].map((product) => (
                <div
                  key={product.slug}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium',
                    productColors[product.slug]
                  )}
                >
                  <span>{product.icon}</span>
                  <span>{product.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div className="px-3 mt-6 flex-1 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-2 font-medium">Recent Chats</p>
            <div className="space-y-0.5">
              {chatHistory.length === 0 ? (
                <p className="text-xs text-[#b5ae9e] px-2 py-2">No conversations yet</p>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={cn(
                      'group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all',
                      activeChatId === chat.id
                        ? 'bg-white text-[#1a1a1a] shadow-sm border border-[#e5e0d8]'
                        : 'text-[#8a8478] hover:bg-white/60 hover:text-[#1a1a1a]'
                    )}
                  >
                    <MessageSquare className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate flex-1">{chat.title || 'New Chat'}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Bottom */}
      <div className="mt-auto p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        {sidebarOpen && (
          <div className="flex items-center gap-2 px-2 text-[#b5ae9e] text-[10px]">
            <Leaf className="w-3 h-3" />
            <span>Powered by Gemini 2.5 Pro</span>
          </div>
        )}
      </div>
    </aside>
  );
}
