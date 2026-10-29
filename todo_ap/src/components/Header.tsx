'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Database, Settings, Clock, Activity } from 'lucide-react';

interface HeaderProps {
  isRealSupabase: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isRealSupabase, onOpenSettings }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* App Title & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Gemini TODO
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                1.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              構造化出力 × Supabase Realtime TODO管理
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-3">
          {/* Reference DateTime Clock */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">基準日時:</span>
            <span className="font-mono text-slate-200">{currentTime || '取得中...'}</span>
          </div>

          {/* Realtime Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              isRealSupabase
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isRealSupabase ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isRealSupabase ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <Database className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">
              {isRealSupabase ? 'Supabase Realtime 接続中' : 'ローカルモック実行中'}
            </span>
          </div>

          {/* Settings / Config Modal Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
            title="設定・環境変数"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">接続設定</span>
          </button>
        </div>
      </div>
    </header>
  );
};
