'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, MessageSquare, Trash2, Leaf,
  FolderOpen, BookOpen, Zap, Settings, ChevronDown, Globe, Code,
  Search, Image, Monitor, Calendar, Users, Hash, BarChart3,
  Brain,
} from 'lucide-react';

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', speed: 'Smart' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', speed: 'Fast' },
];

const AGENT_SKILLS = [
  { name: 'Social Media Posts', icon: Hash, desc: 'Draft posts for any platform', active: true },
  { name: 'Content Calendar', icon: Calendar, desc: 'Plan weeks of content', active: true },
  { name: 'Audience Analysis', icon: Users, desc: 'Research target demographics', active: true },
  { name: 'Trending Topics', icon: BarChart3, desc: 'Find what\'s trending now', active: true },
  { name: 'Deep Research', icon: Search, desc: 'Multi-source web research', active: true },
  { name: 'Web Browser', icon: Globe, desc: 'Browse & extract web data', active: true },
  { name: 'Page Interaction', icon: Monitor, desc: 'Click, fill forms, scroll', active: true },
  { name: 'Image Generation', icon: Image, desc: 'Create images with DALL-E 3', active: true },
  { name: 'Code Sandbox', icon: Code, desc: 'Run Python/JS in cloud VM', active: true },
  { name: '3000+ Apps', icon: Zap, desc: 'Gmail, Slack, Notion, Stripe...', active: true },
];

export function Sidebar() {
  const {
    sidebarOpen, toggleSidebar,
    agents, activeAgent, setActiveAgent,
    chatHistory, setChatHistory, activeChatId, setActiveChatId,
    sidebarTab, setSidebarTab,
    selectedModel, setSelectedModel,
    projects, addProject,
  } = useAppStore();

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

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
      if (activeChatId === id) { setActiveChatId(null); window.location.href = '/'; }
    } catch {}
  };

  const startNewChat = () => { setActiveChatId(null); window.location.href = '/'; };

  const createProject = () => {
    if (!newProjectTitle.trim()) return;
    addProject({
      id: `proj_${Date.now()}`,
      title: newProjectTitle.trim(),
      description: newProjectDesc.trim(),
      agentId: activeAgent?.id || 'default-strategist',
      status: 'pending',
      progress: 0,
    });
    setNewProjectTitle('');
    setNewProjectDesc('');
    setShowNewProject(false);
  };

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const tabs = [
    { id: 'chats' as const, icon: MessageSquare, label: 'Chats' },
    { id: 'projects' as const, icon: FolderOpen, label: 'Projects' },
    { id: 'knowledge' as const, icon: BookOpen, label: 'KB' },
    { id: 'skills' as const, icon: Zap, label: 'Skills' },
  ];

  return (
    <aside
      className={cn('flex flex-col border-r transition-all duration-300 overflow-hidden', sidebarOpen ? 'w-72' : 'w-16')}
      style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
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
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-black/5 text-[#8a8478] hover:text-[#1a1a1a] transition-colors">
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
          {/* Tab Navigation */}
          <div className="px-3 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                  sidebarTab === tab.id
                    ? 'bg-white text-[#1a1a1a] shadow-sm border border-[#e5e0d8]'
                    : 'text-[#b5ae9e] hover:text-[#8a8478] hover:bg-white/40'
                )}
              >
                <tab.icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-3 mt-3">

            {/* CHATS TAB */}
            {sidebarTab === 'chats' && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-1.5 font-medium">Agent</p>
                  <div className="space-y-0.5">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => setActiveAgent(agent)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all',
                          activeAgent?.id === agent.id
                            ? 'bg-white text-[#1a1a1a] shadow-sm border border-[#e5e0d8]'
                            : 'text-[#8a8478] hover:bg-white/60'
                        )}
                      >
                        <span className="text-sm">{agent.avatar}</span>
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-[10px] text-[#b5ae9e] capitalize ml-auto">{agent.role.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-1.5 font-medium">Recent Chats</p>
                  <div className="space-y-0.5">
                    {chatHistory.length === 0 ? (
                      <p className="text-xs text-[#b5ae9e] px-2 py-2">No conversations yet</p>
                    ) : chatHistory.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={cn(
                          'group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all',
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
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PROJECTS TAB */}
            {sidebarTab === 'projects' && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowNewProject(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#d4cec2] text-[#8a8478] hover:border-[#2d8a4e] hover:text-[#2d8a4e] transition-all text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Project</span>
                </button>

                {showNewProject && (
                  <div className="p-3 rounded-lg bg-white border border-[#e5e0d8] shadow-sm space-y-2">
                    <input
                      type="text"
                      placeholder="Project goal (e.g. Write & publish a book)"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#e5e0d8] focus:outline-none focus:border-[#2d8a4e] bg-[#faf8f5]"
                      onKeyDown={(e) => e.key === 'Enter' && createProject()}
                    />
                    <textarea
                      placeholder="Details (optional)"
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#e5e0d8] focus:outline-none focus:border-[#2d8a4e] bg-[#faf8f5] resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={createProject} className="flex-1 px-2.5 py-1.5 rounded-md bg-[#2d8a4e] text-white text-xs font-medium hover:bg-[#247a42]">Create</button>
                      <button onClick={() => setShowNewProject(false)} className="px-2.5 py-1.5 rounded-md text-[#8a8478] text-xs hover:bg-[#f0ece4]">Cancel</button>
                    </div>
                  </div>
                )}

                {projects.length === 0 && !showNewProject && (
                  <div className="text-center py-6">
                    <FolderOpen className="w-8 h-8 text-[#d4cec2] mx-auto mb-2" />
                    <p className="text-xs text-[#b5ae9e]">No projects yet</p>
                    <p className="text-[10px] text-[#d4cec2] mt-1">Create a project to give your agent<br/>a long-running goal to work on</p>
                  </div>
                )}

                {projects.map((project) => (
                  <div key={project.id} className="p-3 rounded-lg bg-white border border-[#e5e0d8] shadow-sm space-y-2 cursor-pointer hover:border-[#2d8a4e]/30 transition-all">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-medium text-[#1a1a1a] leading-tight">{project.title}</p>
                      <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ml-2',
                        project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      )}>{project.status.replace('_', ' ')}</span>
                    </div>
                    {project.description && <p className="text-[10px] text-[#8a8478] line-clamp-2">{project.description}</p>}
                    <div className="w-full h-1 rounded-full bg-[#f0ece4]">
                      <div className="h-1 rounded-full bg-[#2d8a4e] transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* KNOWLEDGE TAB */}
            {sidebarTab === 'knowledge' && (
              <div className="space-y-3">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#d4cec2] text-[#8a8478] hover:border-[#2d8a4e] hover:text-[#2d8a4e] transition-all text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Knowledge Base</span>
                </button>

                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-[#d4cec2] mx-auto mb-2" />
                  <p className="text-xs text-[#b5ae9e]">Upload docs, PDFs, or links</p>
                  <p className="text-[10px] text-[#d4cec2] mt-1">so your agent can reference them</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-1.5 font-medium">Built-in Knowledge</p>
                  {[
                    { name: 'PaperVault.One', icon: '📄', desc: 'Product info, audience, themes' },
                    { name: 'SellFast.Now', icon: '🏷️', desc: 'Product info, audience, themes' },
                    { name: 'BrainCandy.im', icon: '🧠', desc: 'Product info, audience, themes' },
                  ].map((kb) => (
                    <div key={kb.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/60 border border-[#e5e0d8]/50 text-xs mb-1">
                      <span>{kb.icon}</span>
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{kb.name}</p>
                        <p className="text-[10px] text-[#b5ae9e]">{kb.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SKILLS TAB */}
            {sidebarTab === 'skills' && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#b5ae9e] px-2 mb-1.5 font-medium">
                  Agent Capabilities ({AGENT_SKILLS.length})
                </p>
                {AGENT_SKILLS.map((skill) => (
                  <div key={skill.name} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-white/60 transition-all">
                    <div className="w-6 h-6 rounded-md bg-[#2d8a4e]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <skill.icon className="w-3.5 h-3.5 text-[#2d8a4e]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-[#1a1a1a]">{skill.name}</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2d8a4e] flex-shrink-0" />
                      </div>
                      <p className="text-[10px] text-[#8a8478] leading-tight">{skill.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model Selector */}
          <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
            <div className="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/60 border border-[#e5e0d8] hover:border-[#2d8a4e]/30 transition-all text-xs"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-[#2d8a4e]" />
                  <span className="font-medium text-[#1a1a1a]">{currentModel.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2d8a4e]/10 text-[#2d8a4e] font-medium">{currentModel.speed}</span>
                  <ChevronDown className={cn('w-3 h-3 text-[#8a8478] transition-transform', showModelPicker && 'rotate-180')} />
                </div>
              </button>
              {showModelPicker && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg border border-[#e5e0d8] shadow-lg overflow-hidden z-50">
                  {AVAILABLE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#faf8f5] transition-all',
                        selectedModel === model.id && 'bg-[#2d8a4e]/5'
                      )}
                    >
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{model.name}</p>
                        <p className="text-[10px] text-[#8a8478]">{model.provider}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f0ece4] text-[#8a8478]">{model.speed}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bottom */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        {sidebarOpen ? (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[#b5ae9e] text-[10px]">
              <Leaf className="w-3 h-3" />
              <span>9 tables · 10 skills</span>
            </div>
            <button className="p-1 rounded hover:bg-black/5 text-[#b5ae9e] hover:text-[#1a1a1a] transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Leaf className="w-3.5 h-3.5 text-[#b5ae9e]" />
          </div>
        )}
      </div>
    </aside>
  );
}
