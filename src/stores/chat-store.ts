import { create } from "zustand";

interface Project {
  id: string;
  title: string;
  goal?: string;
  status: string;
  agentName: string;
  lastMessage?: string;
  updatedAt: Date;
}

interface ChatStore {
  // Projects
  projects: Project[];
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  projects: [],
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  selectedModel: "gemini",
  setSelectedModel: (model) => set({ selectedModel: model }),
}));
