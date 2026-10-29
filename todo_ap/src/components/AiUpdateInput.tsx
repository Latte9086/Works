'use client';

import React, { useState } from 'react';
import { Edit3, Sparkles, Loader2, ListFilter, ArrowRight } from 'lucide-react';
import { Todo, UndoAction } from '@/types/todo';

interface AiUpdateInputProps {
  uncompletedTodos: Todo[];
  onSuccess: (updatedTodo: Todo, undoAction: UndoAction) => void;
  onError: (message: string, detail?: string) => void;
}

const SAMPLE_UPDATE_PROMPTS = [
  '線形代数の課題の期限を明後日に変更して',
  '新歓ビラのタイトルを「新歓資料の作成」にして',
  '常備薬の買い出しを大学カテゴリに変えて',
  '海外旅行の航空券の期限を来週にして（該当なしテスト）',
];

export const AiUpdateInput: React.FC<AiUpdateInputProps> = ({
  uncompletedTodos,
  onSuccess,
  onError,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSubmit = (customText !== undefined ? customText : prompt).trim();
    if (!textToSubmit || loading) return;

    if (uncompletedTodos.length === 0) {
      onError('未完了のタスクがありません', 'まず新規タスクを作成してから更新をお試しください');
      return;
    }

    setLoading(true);

    try {
      const currentDateTime = new Date().toISOString();
      // 未完了TODOの id, title, category, due_date のみをGeminiコンテキストとして抽出
      const sanitizedTodos = uncompletedTodos.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        due_date: t.due_date,
      }));

      const res = await fetch('/api/gemini/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todos: sanitizedTodos,
          prompt: textToSubmit,
          currentDateTime,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.is_valid_instruction) {
        // 無関係な入力または該当タスク特定失敗
        onError(
          data.message || '該当するタスクが見つかりませんでした',
          '指示内容が未完了タスク一覧のいずれかと合致しているか確認してください'
        );
        return;
      }

      // 成功時
      const updatedTodo = data.updatedTodo as Todo;
      const previousTodo = data.previousTodo as Todo;

      const undoAction: UndoAction = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        type: 'update',
        description: `タスク「${updatedTodo.title}」を更新しました`,
        previousTodo: previousTodo,
        currentTodo: updatedTodo,
        timestamp: Date.now(),
      };

      onSuccess(updatedTodo, undoAction);
      setPrompt('');
    } catch (err: unknown) {
      console.error('Error submitting update prompt:', err);
      onError('リクエスト送信中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl transition-all duration-300 hover:border-purple-500/40">
      {/* Subtle background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                ② 既存TODO追加・差分更新（コンテキスト連動）
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-mono">
                Contextual
              </span>
            </div>
            <p className="text-xs text-slate-400">
              現在の未完了リストを参照し、対象タスクの指定項目のみを更新します
            </p>
          </div>
        </div>

        {/* Uncompleted Count Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <ListFilter className="w-3.5 h-3.5 text-purple-400" />
          <span>対象: {uncompletedTodos.length}件</span>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => handleSubmit(e)} className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading || uncompletedTodos.length === 0}
            placeholder={
              uncompletedTodos.length === 0
                ? '未完了タスクがありません（新規作成してください）'
                : '例: 線形代数の課題の期限を明後日に変更して...'
            }
            className="w-full pl-4 pr-28 py-3 rounded-xl bg-slate-950/80 border border-slate-700/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-slate-100 placeholder-slate-500 transition-all outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim() || uncompletedTodos.length === 0}
            className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>解析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI更新</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Prompts */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <span className="text-[11px] text-slate-500 font-medium">試す:</span>
        {SAMPLE_UPDATE_PROMPTS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            disabled={loading || uncompletedTodos.length === 0}
            onClick={() => {
              setPrompt(sample);
              handleSubmit(undefined, sample);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/40 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1"
          >
            <span>{sample}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-60" />
          </button>
        ))}
      </div>
    </div>
  );
};
