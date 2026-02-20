'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastId = 0;
const listeners = new Set<(toast: Toast) => void>();

export function toast(message: string, type: ToastType = 'info', duration = 4000) {
  const t: Toast = { id: String(++toastId), message, type, duration };
  listeners.forEach((fn) => fn(t));
}

toast.success = (msg: string, duration?: number) => toast(msg, 'success', duration);
toast.error = (msg: string, duration?: number) => toast(msg, 'error', duration);
toast.warning = (msg: string, duration?: number) => toast(msg, 'warning', duration);
toast.info = (msg: string, duration?: number) => toast(msg, 'info', duration);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-[#2d8a4e] shrink-0" />,
  error: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-[#e8f5ec] border-[#2d8a4e]/20',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev.slice(-4), t]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg animate-fade-in',
        bgColors[t.type]
      )}
    >
      {icons[t.type]}
      <p className="text-sm text-[#1a1a1a] flex-1">{t.message}</p>
      <button
        onClick={() => onDismiss(t.id)}
        className="p-0.5 rounded hover:bg-black/5 text-[#8a8478] shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
