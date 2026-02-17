'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  X, User, Key, Shield, Trash2, CheckCircle2, XCircle,
  ExternalLink, Copy, Check, AlertTriangle, Sparkles,
  Database, Globe, Code, Image, Search, Zap, Brain,
  Bell, RefreshCw, ChevronDown, ChevronRight, Phone,
} from 'lucide-react';

interface EnvVar {
  key: string;
  label: string;
  feature: string;
  where: string;
  configured: boolean;
}

interface SettingsData {
  user: { name: string; email: string };
  settings: Record<string, unknown>;
  envVars: EnvVar[];
  summary: { configured: number; total: number; percentage: number };
}

const FEATURE_ICONS: Record<string, typeof Globe> = {
  'Google Gemini': Brain,
  'Anthropic': Search,
  'OpenAI': Image,
  'Browserbase': Globe,
  'Browserbase Project': Globe,
  'E2B': Code,
  'Pipedream': Zap,
  'Pipedream Secret': Zap,
  'Pipedream Project': Zap,
  'Database': Database,
  'NextAuth': Shield,
  'Twilio': Phone,
  'Twilio Auth': Phone,
  'Twilio Number': Phone,
};

export function SettingsPanel({ onClose, onOpenImportMemories }: { onClose: () => void; onOpenImportMemories?: () => void }) {
  const { selectedModel, setSelectedModel } = useAppStore();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('integrations');
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);
  const [memCount, setMemCount] = useState<number | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const d = await res.json();
      setData(d);
      setName(d.user.name || '');
      setEmail(d.user.email || '');
    } catch {}
    try {
      const res = await fetch('/api/memories');
      const d = await res.json();
      setMemCount(d.memories?.length || 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
    } catch {}
    setSaving(false);
  };

  const clearData = async (type: 'chats' | 'notifications' | 'projects') => {
    try {
      if (type === 'chats') {
        // Delete all chats
        const res = await fetch('/api/chats');
        const d = await res.json();
        for (const chat of d.chats || []) {
          await fetch(`/api/chats/${chat.id}`, { method: 'DELETE' });
        }
      } else if (type === 'notifications') {
        await fetch('/api/notifications', { method: 'DELETE' });
      } else if (type === 'projects') {
        const res = await fetch('/api/projects');
        const d = await res.json();
        for (const proj of d.projects || []) {
          await fetch(`/api/projects/${proj.id}`, { method: 'DELETE' });
        }
      }
    } catch {}
    setConfirmClear(null);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-[600px] bg-white rounded-2xl p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-[#2d8a4e] mx-auto" />
          <p className="text-sm text-[#8a8478] mt-3">Loading settings...</p>
        </div>
      </div>
    );
  }

  const configuredCount = data?.summary.configured || 0;
  const totalCount = data?.summary.total || 0;
  const percentage = data?.summary.percentage || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[640px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e0d8]">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a1a]">Settings</h2>
            <p className="text-xs text-[#8a8478] mt-0.5">Manage your agent, integrations, and preferences</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f0ece4] text-[#8a8478] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Integration Status Banner */}
          <div className="px-6 py-4 border-b border-[#e5e0d8]" style={{ backgroundColor: '#faf8f5' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e0d8"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#2d8a4e"
                    strokeWidth="3"
                    strokeDasharray={`${percentage}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#2d8a4e]">
                  {percentage}%
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">{configuredCount} of {totalCount} integrations active</p>
                <p className="text-[11px] text-[#8a8478]">
                  {percentage === 100
                    ? 'All integrations configured — full power!'
                    : 'Add missing API keys to unlock more agent capabilities'}
                </p>
              </div>
            </div>
          </div>

          {/* === PROFILE SECTION === */}
          <div className="px-6 py-4 border-b border-[#e5e0d8]">
            <button onClick={() => toggleSection('profile')} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#2d8a4e]" />
                <span className="text-sm font-semibold text-[#1a1a1a]">Profile</span>
              </div>
              {expandedSection === 'profile' ? <ChevronDown className="w-4 h-4 text-[#8a8478]" /> : <ChevronRight className="w-4 h-4 text-[#8a8478]" />}
            </button>
            {expandedSection === 'profile' && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#8a8478] font-medium">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-[#e5e0d8] focus:outline-none focus:border-[#2d8a4e] bg-[#faf8f5]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#8a8478] font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-[#e5e0d8] focus:outline-none focus:border-[#2d8a4e] bg-[#faf8f5]"
                  />
                </div>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#2d8a4e] text-white text-sm font-medium hover:bg-[#247a42] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}
          </div>

          {/* === MODEL PREFERENCES === */}
          <div className="px-6 py-4 border-b border-[#e5e0d8]">
            <button onClick={() => toggleSection('model')} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#2d8a4e]" />
                <span className="text-sm font-semibold text-[#1a1a1a]">Model Preferences</span>
              </div>
              {expandedSection === 'model' ? <ChevronDown className="w-4 h-4 text-[#8a8478]" /> : <ChevronRight className="w-4 h-4 text-[#8a8478]" />}
            </button>
            {expandedSection === 'model' && (
              <div className="mt-3 space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#8a8478] font-medium">Default Model</label>
                {[
                  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Most capable. Best for complex tasks.', badge: 'Smart' },
                  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Faster responses. Good for simple tasks.', badge: 'Fast' },
                ].map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left',
                      selectedModel === model.id
                        ? 'border-[#2d8a4e] bg-[#2d8a4e]/5'
                        : 'border-[#e5e0d8] hover:border-[#2d8a4e]/30'
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">{model.name}</p>
                      <p className="text-[11px] text-[#8a8478] mt-0.5">{model.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f0ece4] text-[#8a8478] font-medium">{model.badge}</span>
                      {selectedModel === model.id && <CheckCircle2 className="w-4 h-4 text-[#2d8a4e]" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* === MEMORIES === */}
          <div className="px-6 py-4 border-b border-[#e5e0d8]">
            <button onClick={() => toggleSection('memories')} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2d8a4e]" />
                <span className="text-sm font-semibold text-[#1a1a1a]">Memories</span>
                {memCount !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2d8a4e]/10 text-[#2d8a4e] font-medium">
                    {memCount}
                  </span>
                )}
              </div>
              {expandedSection === 'memories' ? <ChevronDown className="w-4 h-4 text-[#8a8478]" /> : <ChevronRight className="w-4 h-4 text-[#8a8478]" />}
            </button>
            {expandedSection === 'memories' && (
              <div className="mt-3 space-y-3">
                <p className="text-[11px] text-[#8a8478]">
                  Memories help your agent understand your preferences, work style, and interests from day one.
                </p>
                {memCount === 0 ? (
                  <div className="text-center py-4">
                    <Brain className="w-8 h-8 text-[#d4cec2] mx-auto mb-2" />
                    <p className="text-xs text-[#b5ae9e]">No memories imported yet</p>
                    <button
                      onClick={() => { onClose(); onOpenImportMemories?.(); }}
                      className="mt-2 px-4 py-2 rounded-lg bg-[#2d8a4e] text-white text-xs font-medium hover:bg-[#247a42] transition-colors"
                    >
                      Import from ChatGPT
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-100 bg-green-50/50">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-[#1a1a1a]">{memCount} memories active</p>
                        <p className="text-[10px] text-[#8a8478]">Your agent uses these to personalize responses</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onClose(); onOpenImportMemories?.(); }}
                        className="flex-1 px-3 py-2 rounded-lg border border-[#e5e0d8] text-xs font-medium text-[#8a8478] hover:text-[#2d8a4e] hover:border-[#2d8a4e]/30 transition-colors"
                      >
                        Import More
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Clear all imported memories?')) {
                            await fetch('/api/memories', { method: 'DELETE' });
                            setMemCount(0);
                          }
                        }}
                        className="px-3 py-2 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* === INTEGRATIONS === */}
          <div className="px-6 py-4 border-b border-[#e5e0d8]">
            <button onClick={() => toggleSection('integrations')} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#2d8a4e]" />
                <span className="text-sm font-semibold text-[#1a1a1a]">Integrations & API Keys</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2d8a4e]/10 text-[#2d8a4e] font-medium">
                  {configuredCount}/{totalCount}
                </span>
              </div>
              {expandedSection === 'integrations' ? <ChevronDown className="w-4 h-4 text-[#8a8478]" /> : <ChevronRight className="w-4 h-4 text-[#8a8478]" />}
            </button>
            {expandedSection === 'integrations' && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] text-[#8a8478] mb-2">
                  API keys are set as environment variables in Vercel. Go to{' '}
                  <span className="font-medium text-[#1a1a1a]">Vercel → doanything-clone → Settings → Environment Variables</span>
                </p>
                {(data?.envVars || []).map((env) => {
                  const Icon = FEATURE_ICONS[env.label] || Key;
                  return (
                    <div
                      key={env.key}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
                        env.configured
                          ? 'border-green-100 bg-green-50/50'
                          : 'border-amber-100 bg-amber-50/30'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
                        env.configured ? 'bg-green-100' : 'bg-amber-100'
                      )}>
                        <Icon className={cn('w-3.5 h-3.5', env.configured ? 'text-green-600' : 'text-amber-600')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-[#1a1a1a]">{env.label}</p>
                          {env.configured ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                        <p className="text-[10px] text-[#8a8478] truncate">{env.feature}</p>
                      </div>
                      {!env.configured && (
                        <button
                          onClick={() => copyText(env.key, env.key)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors flex-shrink-0"
                          title={`Find at: ${env.where}`}
                        >
                          {copied === env.key ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{copied === env.key ? 'Copied' : 'Copy key name'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#e5e0d8]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#8a8478]" />
                  <p className="text-[10px] text-[#8a8478]">
                    After adding/changing env vars in Vercel, redeploy to activate them.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* === DANGER ZONE === */}
          <div className="px-6 py-4">
            <button onClick={() => toggleSection('danger')} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-600">Danger Zone</span>
              </div>
              {expandedSection === 'danger' ? <ChevronDown className="w-4 h-4 text-[#8a8478]" /> : <ChevronRight className="w-4 h-4 text-[#8a8478]" />}
            </button>
            {expandedSection === 'danger' && (
              <div className="mt-3 space-y-2">
                {[
                  { id: 'chats', label: 'Clear All Chats', desc: 'Delete all conversation history' },
                  { id: 'notifications', label: 'Clear Notifications', desc: 'Delete all inbox notifications' },
                  { id: 'projects', label: 'Delete All Projects', desc: 'Remove all projects and their data' },
                ].map((action) => (
                  <div key={action.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-red-100 bg-red-50/30">
                    <div>
                      <p className="text-xs font-medium text-[#1a1a1a]">{action.label}</p>
                      <p className="text-[10px] text-[#8a8478]">{action.desc}</p>
                    </div>
                    {confirmClear === action.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => clearData(action.id as 'chats' | 'notifications' | 'projects')}
                          className="px-2 py-1 rounded text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmClear(null)}
                          className="px-2 py-1 rounded text-[10px] font-medium text-[#8a8478] hover:bg-[#f0ece4] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClear(action.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e5e0d8] flex items-center justify-between" style={{ backgroundColor: '#faf8f5' }}>
          <div className="text-[10px] text-[#b5ae9e]">
            <span className="font-medium">DoAnything</span> · 16 tables · {configuredCount} integrations active
          </div>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#8a8478] hover:bg-[#f0ece4] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
