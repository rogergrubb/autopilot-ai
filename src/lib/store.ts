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

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Active agent
  activeAgent: Agent | null;
  setActiveAgent: (agent: Agent | null) => void;

  // Projects
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;

  // Default agents
  agents: Agent[];
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeAgent: {
    id: 'default-strategist',
    name: 'Nova',
    role: 'social_strategist',
    status: 'idle',
    avatar: '🚀',
  },
  setActiveAgent: (agent) => set({ activeAgent: agent }),

  projects: [],
  activeProject: null,
  setActiveProject: (project) => set({ activeProject: project }),
  addProject: (project) =>
    set((s) => ({ projects: [...s.projects, project] })),

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
