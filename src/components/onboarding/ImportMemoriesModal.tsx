'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Sparkles, Brain, Check, Loader2, X } from 'lucide-react';

interface ImportMemoriesModalProps {
  onClose: () => void;
  onImported?: (count: number) => void;
}

export function ImportMemoriesModal({ onClose, onImported }: ImportMemoriesModalProps) {
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!pasteText.trim()) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: pasteText, source: 'chatgpt' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Import failed');
      } else {
        setResult({ count: data.imported });
        onImported?.(data.imported);
      }
    } catch {
      setError('Network error — please try again');
    }
    setImporting(false);
  };

  // Success state
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
        <div
          className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#2d8a4e]/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-[#2d8a4e]" />
            </div>
            <h3 className="text-lg font-bold text-[#1a1a1a]">Memories Imported!</h3>
            <p className="text-sm text-[#8a8478] mt-2">
              Successfully imported <span className="font-semibold text-[#2d8a4e]">{result.count} memories</span> from ChatGPT.
            </p>
            <p className="text-xs text-[#b5ae9e] mt-1">
              Your agent now knows your preferences, work style, and interests.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-8 py-2.5 rounded-xl bg-[#2d8a4e] text-white text-sm font-semibold hover:bg-[#247a42] transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#f0ece4] text-[#b5ae9e] hover:text-[#8a8478] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#2d8a4e]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#2d8a4e]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1a1a1a]">Import Your Memories</h2>
            </div>
          </div>
          <p className="text-sm text-[#8a8478] leading-relaxed">
            Your ChatGPT memories contain valuable context about your preferences,
            work style, and interests. Importing them helps Do Anything work better
            for you from day one.
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 pb-6 space-y-4">
          {/* Step 1 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#2d8a4e] text-white text-[10px] font-bold flex items-center justify-center">1</span>
              <span className="text-sm font-medium text-[#1a1a1a]">Get your memories from ChatGPT</span>
            </div>
            <a
              href="https://chatgpt.com/?hints=memories"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-[#2d8a4e]/20 hover:border-[#2d8a4e]/40 bg-[#faf8f5] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#e5e0d8] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-[#1a1a1a] group-hover:text-[#2d8a4e] transition-colors">
                  Open ChatGPT & Get Memories
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-[#b5ae9e] group-hover:text-[#2d8a4e] transition-colors" />
            </a>
            <p className="text-[10px] text-[#b5ae9e] mt-1.5 px-1">
              Ask ChatGPT: &quot;List all your memories about me&quot; — then copy the response.
            </p>
          </div>

          {/* Step 2 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#2d8a4e] text-white text-[10px] font-bold flex items-center justify-center">2</span>
              <span className="text-sm font-medium text-[#1a1a1a]">Paste the response here</span>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="User likes concise answers... Has a dog named Rover... Works in marketing..."
              rows={5}
              className="w-full px-4 py-3 text-sm rounded-xl border-2 border-[#e5e0d8] focus:outline-none focus:border-[#2d8a4e] bg-[#faf8f5] placeholder:text-[#d4cec2] resize-none transition-colors"
            />
            {error && (
              <p className="text-[11px] text-red-500 mt-1 px-1">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#8a8478] hover:text-[#1a1a1a] transition-colors font-medium"
            >
              Skip for now
            </button>
            <button
              onClick={handleImport}
              disabled={!pasteText.trim() || importing}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
                pasteText.trim() && !importing
                  ? 'bg-[#2d8a4e] text-white hover:bg-[#247a42] shadow-sm'
                  : 'bg-[#e5e0d8] text-[#b5ae9e] cursor-not-allowed'
              )}
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </span>
              ) : (
                'Import Memories'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
