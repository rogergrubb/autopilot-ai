"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Bot,
  Zap,
  Settings,
} from "lucide-react";

export function Sidebar() {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    sidebarOpen,
    toggleSidebar,
  } = useChatStore();

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-300",
        sidebarOpen ? "w-72" : "w-16"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">DoAnything</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* New Project Button */}
      <div className="p-3">
        <button
          onClick={() => setActiveProject(null)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg",
            "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
            "text-white font-medium text-sm transition-all",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>New Agent Task</span>}
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {projects.length === 0 && sidebarOpen && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No projects yet</p>
            <p className="text-xs mt-1">Start a new task to begin</p>
          </div>
        )}
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setActiveProject(project.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-colors",
              activeProjectId === project.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
              !sidebarOpen && "justify-center px-0"
            )}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {project.title}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {project.agentName} ·{" "}
                  {project.status === "active" ? "Working..." : project.status}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-sm",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </button>
      </div>
    </div>
  );
}
