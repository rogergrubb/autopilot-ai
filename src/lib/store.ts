import { create } from 'zustand';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'waiting' | 'paused';
  avatar: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  agentId: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
}

interface ChatSummary {
  id: string;
  title: string;
  agentRole: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  fileCount: number;
  createdAt: string;
}

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  sidebarTab: 'chats' | 'projects' | 'knowledge' | 'skills';
  setSidebarTab: (tab: 'chats' | 'projects' | 'knowledge' | 'skills') => void;

  // Active agent
  activeAgent: Agent | null;
  setActiveAgent: (agent: Agent | null) => void;

  // Model selector
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // Projects
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;

  // Chat persistence
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  chatHistory: ChatSummary[];
  setChatHistory: (chats: ChatSummary[]) => void;

  // Knowledge Bases
  knowledgeBases: KnowledgeBase[];
  setKnowledgeBases: (kbs: KnowledgeBase[]) => void;

  // Default agents
  agents: Agent[];
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  sidebarTab: 'chats',
  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  activeAgent: {
    id: 'default-strategist',
    name: 'Nova',
    role: 'social_strategist',
    status: 'idle',
    avatar: '🚀',
  },
  setActiveAgent: (agent) => set({ activeAgent: agent }),

  selectedModel: 'gemini-2.5-pro',
  setSelectedModel: (model) => set({ selectedModel: model }),

  projects: [],
  activeProject: null,
  setActiveProject: (project) => set({ activeProject: project }),
  addProject: (project) =>
    set((s) => ({ projects: [...s.projects, project] })),

  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),
  chatHistory: [],
  setChatHistory: (chats) => set({ chatHistory: chats }),

  knowledgeBases: [],
  setKnowledgeBases: (kbs) => set({ knowledgeBases: kbs }),

  agents: [
    {
      id: 'default-strategist',
      name: 'Nova',
      role: 'social_strategist',
      status: 'idle',
      avatar: '🚀',
    },
    {
      id: 'content-creator',
      name: 'Pixel',
      role: 'content_creator',
      status: 'idle',
      avatar: '🎨',
    },
    {
      id: 'researcher',
      name: 'Scout',
      role: 'researcher',
      status: 'idle',
      avatar: '🔍',
    },
  ],
}));
