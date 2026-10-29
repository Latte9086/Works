'use client';

import React, { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import { UndoAction } from '@/types/todo';

interface UndoToastProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ action, onUndo, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!action) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const duration = 7000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [action]);

  if (!action) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-none">
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-2xl p-4 text-white flex items-center justify-between gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
        {/* Progress bar line */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <Undo2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {action.description}
            </p>
            <p className="text-xs text-slate-400">
              直前の状態に戻すことができます
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all duration-150 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>元に戻す</span>
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
