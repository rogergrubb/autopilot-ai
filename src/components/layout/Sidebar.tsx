'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Bot, ChevronLeft, ChevronRight, FolderOpen, Plus, Sparkles, Target, Zap } from 'lucide-react';

const productColors: Record<string, string> = {
  papervault: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  sellfast: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  braincandy: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, agents, activeAgent, setActiveAgent, projects } = useAppStore();

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-white/10 bg-[#0a0a0f] transition-all duration-300',
        sidebarOpen ? 'w-72' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">DoAnything</h1>
              <p className="text-[10px] text-white/40">by NumberOneSon</p>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 hover:border-blue-500/40 text-white/80 hover:text-white transition-all text-sm">
          <Plus className="w-4 h-4" />
          {sidebarOpen && <span>New Project</span>}
        </button>
      </div>

      {sidebarOpen && (
        <>
          {/* Agents */}
          <div className="px-3 mt-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30 px-2 mb-2">Agents</p>
            <div className="space-y-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                    activeAgent?.id === agent.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  <span className="text-lg">{agent.avatar}</span>
                  <div className="text-left">
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-[10px] text-white/30 capitalize">{agent.role.replace('_', ' ')}</p>
                  </div>
                  <div
                    className={cn(
                      'ml-auto w-2 h-2 rounded-full',
                      agent.status === 'working' ? 'bg-green-400 animate-pulse' : 'bg-white/20'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="px-3 mt-6">
            <p className="text-[10px] uppercase tracking-wider text-white/30 px-2 mb-2">Promoting</p>
            <div className="space-y-1">
              {[
                { name: 'PaperVault.One', slug: 'papervault', icon: '📄' },
                { name: 'SellFast.Now', slug: 'sellfast', icon: '🏷️' },
                { name: 'BrainCandy.im', slug: 'braincandy', icon: '🧠' },
              ].map((product) => (
                <div
                  key={product.slug}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                    productColors[product.slug]
                  )}
                >
                  <span>{product.icon}</span>
                  <span className="font-medium">{product.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-3 mt-6">
            <p className="text-[10px] uppercase tracking-wider text-white/30 px-2 mb-2">Quick Actions</p>
            <div className="space-y-1">
              {[
                { label: 'Create Content Calendar', icon: <Target className="w-3.5 h-3.5" /> },
                { label: 'Draft Social Posts', icon: <Sparkles className="w-3.5 h-3.5" /> },
                { label: 'Analyze Performance', icon: <FolderOpen className="w-3.5 h-3.5" /> },
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom */}
      <div className="mt-auto p-3 border-t border-white/10">
        {sidebarOpen && (
          <div className="flex items-center gap-2 px-2 text-white/30 text-[10px]">
            <Bot className="w-3 h-3" />
            <span>Powered by Gemini 2.5 Pro</span>
          </div>
        )}
      </div>
    </aside>
  );
}
