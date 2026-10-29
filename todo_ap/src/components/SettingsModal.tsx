'use client';

import React, { useState } from 'react';
import {
  X,
  Database,
  Key,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { mockStore } from '@/lib/mockStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRealSupabase: boolean;
  onResetMockData: () => void;
}

const SUPABASE_SQL = `-- 1. テーブル作成
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('大学', 'サークル', '個人')),
  due_date text, -- '今日', '明日', 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm'
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Supabase Realtimeを有効化
alter publication supabase_realtime add table todos;

-- 3. Row Level Security (RLS) を有効化しAnon操作を許可
alter table todos enable row level security;
create policy "Allow all operations for anon" on todos for all using (true) with check (true);`;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isRealSupabase,
  onResetMockData,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">接続設定 & Supabase SQL</h3>
              <p className="text-xs text-slate-400">環境変数とデータベースのセットアップ手順</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 mt-5 text-sm">
          {/* Status Alert */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isRealSupabase
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
            }`}
          >
            {isRealSupabase ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-xs sm:text-sm">
                {isRealSupabase
                  ? 'Supabase Cloudと正常に接続されています（Realtime有効）'
                  : '現在はローカルモックモードで動作しています'}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {isRealSupabase
                  ? 'すべてのTODO変更はPostgreSQLへ永続化され、リアルタイム同期されます。'
                  : '.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定すると、本番Supabaseと接続されます。'}
              </p>
            </div>
          </div>

          {/* Environment Variables Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>必要な環境変数 (.env.local)</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 overflow-x-auto">
              <p>NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co</p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]</p>
              <p>GEMINI_API_KEY=[YOUR-GEMINI-API-KEY]</p>
            </div>
          </div>

          {/* Supabase SQL Runner */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Supabase SQLエディタ用 スクリプト</span>
              </h4>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'コピーしました' : 'SQLをコピー'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
              {SUPABASE_SQL}
            </pre>
          </div>

          {/* Local Mock Store Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-300">モックデータの初期化</p>
              <p className="text-[11px] text-slate-500">
                ローカルストレージのサンプルTODOを初期状態に戻します
              </p>
            </div>
            <button
              onClick={() => {
                onResetMockData();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>データを初期化</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
