'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useAppStore } from '@/lib/store';
import { Menu } from 'lucide-react';

export default function Home() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden" style={{ height: '100dvh' }}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] shadow-2xl animate-slide-in-left">
            <Sidebar forceMobileOpen />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 relative flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--sidebar-border)', backgroundColor: 'var(--sidebar-bg)' }}>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg hover:bg-black/5 text-[#8a8478] hover:text-[#1a1a1a] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#2d8a4e] flex items-center justify-center">
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <span className="text-sm font-semibold text-[#1a1a1a]">AutoPilot AI</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
