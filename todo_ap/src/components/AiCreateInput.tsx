'use client';

import React, { useState } from 'react';
import { PlusCircle, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { Todo, UndoAction } from '@/types/todo';

interface AiCreateInputProps {
  onSuccess: (newTodo: Todo, undoAction: UndoAction) => void;
  onError: (message: string, detail?: string) => void;
}

const SAMPLE_PROMPTS = [
  '明日17時までに線形代数の課題を提出',
  '今週金曜日にサークル新歓の打ち合わせ',
  '常備薬と牛乳をスーパーで買う',
  '今日はとても良い天気ですね（無関係テスト）',
];

export const AiCreateInput: React.FC<AiCreateInputProps> = ({ onSuccess, onError }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSubmit = (customText !== undefined ? customText : prompt).trim();
    if (!textToSubmit || loading) return;

    setLoading(true);

    try {
      const currentDateTime = new Date().toISOString();
      const res = await fetch('/api/gemini/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSubmit,
          currentDateTime,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.is_todo) {
        // 無関係な入力または認識失敗
        onError(
          data.message || 'TODOとして認識できませんでした',
          '入力文がTODO（タスク）であるか、期限や内容をご確認ください'
        );
        return;
      }

      // 成功時
      const newTodo = data.todo as Todo;
      const undoAction: UndoAction = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        type: 'create',
        description: `タスク「${newTodo.title}」を作成しました`,
        previousTodo: newTodo,
        currentTodo: newTodo,
        timestamp: Date.now(),
      };

      onSuccess(newTodo, undoAction);
      setPrompt('');
    } catch (err: unknown) {
      console.error('Error submitting create prompt:', err);
      onError('リクエスト送信中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl transition-all duration-300 hover:border-indigo-500/40">
      {/* Subtle background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
            <PlusCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                ① 新規TODO作成（完全ステートレス）
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono">
                Stateless
              </span>
            </div>
            <p className="text-xs text-slate-400">
              過去の履歴は参照せず、入力内容と現在日時から分類・登録します
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => handleSubmit(e)} className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="例: 明後日までに線形代数の期末レポートを作成する..."
            className="w-full pl-4 pr-28 py-3 rounded-xl bg-slate-950/80 border border-slate-700/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-100 placeholder-slate-500 transition-all outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI作成</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Prompts */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <span className="text-[11px] text-slate-500 font-medium">試す:</span>
        {SAMPLE_PROMPTS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            disabled={loading}
            onClick={() => {
              setPrompt(sample);
              handleSubmit(undefined, sample);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1"
          >
            <span>{sample}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-60" />
          </button>
        ))}
      </div>
    </div>
  );
};
