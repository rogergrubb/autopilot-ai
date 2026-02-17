'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  Clock,
  X,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  source: string | null;
  chatId: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  task: { icon: ListTodo, color: 'text-purple-600', bg: 'bg-purple-50' },
  reminder: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
};

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=30');
      const data = await res.json();
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  }, []);

  // Load on mount + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const clearAll = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      setItems([]);
      setUnreadCount(0);
    } catch {}
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
        className="relative p-1.5 rounded-lg hover:bg-black/5 text-[#8a8478] hover:text-[#1a1a1a] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 md:w-80 max-h-[70vh] md:max-h-[500px] bg-white rounded-xl border border-[#e5e0d8] shadow-xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e0d8]">
            <h3 className="text-sm font-semibold text-[#1a1a1a]">Inbox</h3>
            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    className="p-1 rounded hover:bg-[#f0ece4] text-[#8a8478] hover:text-[#2d8a4e] transition-colors"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-1 rounded hover:bg-[#f0ece4] text-[#8a8478] hover:text-red-500 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-[#f0ece4] text-[#8a8478] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#b5ae9e]">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">No notifications yet</p>
                <p className="text-[10px] mt-1 text-[#d4cec2]">Your agent will send updates here</p>
              </div>
            ) : (
              items.map((notif) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                const Icon = config.icon;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'px-4 py-3 border-b border-[#f0ece4] hover:bg-[#faf8f5] transition-all',
                      !notif.read && 'bg-[#faf8f5]'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('text-xs font-medium truncate', !notif.read ? 'text-[#1a1a1a]' : 'text-[#8a8478]')}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#2d8a4e] flex-shrink-0" />
                          )}
                        </div>
                        {notif.body && (
                          <p className="text-[10px] text-[#8a8478] mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-[#b5ae9e]">{timeAgo(notif.createdAt)}</span>
                          {notif.source && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-[#f0ece4] text-[#8a8478]">{notif.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
