'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Target, FolderOpen, Leaf } from 'lucide-react';

const productColors: Record<string, string> = {
  papervault: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sellfast: 'bg-orange-50 text-orange-700 border-orange-200',
  braincandy: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, agents, activeAgent, setActiveAgent } = useAppStore();

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
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#2d8a4e] hover:bg-[#247a42] text-white transition-all text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" />
          {sidebarOpen && <span>New Project</span>}
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

          {/* Quick Actions */}
          <div className="px-3 mt-6">
            <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-2 font-medium">Quick Actions</p>
            <div className="space-y-1">
              {[
                { label: 'Create Content Calendar', icon: <Target className="w-3.5 h-3.5" /> },
                { label: 'Draft Social Posts', icon: <Sparkles className="w-3.5 h-3.5" /> },
                { label: 'Analyze Performance', icon: <FolderOpen className="w-3.5 h-3.5" /> },
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#8a8478] hover:text-[#1a1a1a] hover:bg-white/60 transition-all text-xs"
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
