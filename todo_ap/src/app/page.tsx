'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { AiCreateInput } from '@/components/AiCreateInput';
import { AiUpdateInput } from '@/components/AiUpdateInput';
import { TodoList } from '@/components/TodoList';
import { UndoToast } from '@/components/UndoToast';
import { ToastNotification, ToastMessage } from '@/components/ToastNotification';
import { SettingsModal } from '@/components/SettingsModal';
import { useTodosRealtime } from '@/hooks/useTodosRealtime';
import { Todo, UndoAction } from '@/types/todo';
import { mockStore } from '@/lib/mockStore';

export default function HomePage() {
  const {
    todos,
    loading,
    isRealSupabase,
    toggleComplete,
    updateTodo,
    deleteTodo,
    currentUndo,
    executeUndo,
    dismissUndo,
    triggerUndo,
    setTodos,
  } = useTodosRealtime();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 未完了TODOリスト（更新用AI窓口に渡す）
  const uncompletedTodos = useMemo(() => {
    return todos.filter((t) => !t.is_completed);
  }, [todos]);

  // Toast Helpers
  const addToast = (type: 'error' | 'success' | 'info', message: string, detail?: string) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, type, message, detail }]);

    // 5秒後に自動消去
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // AI作成成功時
  const handleCreateSuccess = (newTodo: Todo, undoAction: UndoAction) => {
    // 楽観的ローカル更新（Realtime受信前にも即座に反映）
    setTodos((prev) => {
      if (prev.some((t) => t.id === newTodo.id)) return prev;
      return [newTodo, ...prev];
    });
    triggerUndo(undoAction);
  };

  // AI更新成功時
  const handleUpdateSuccess = (updatedTodo: Todo, undoAction: UndoAction) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t))
    );
    triggerUndo(undoAction);
  };

  // モックデータ初期化
  const handleResetMockData = () => {
    mockStore.resetToDefault();
    setTodos(mockStore.getTodos());
    addToast('success', 'モックデータを初期サンプルにリセットしました');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Toast Notifications for AI/System errors */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />

      {/* Global Header */}
      <Header
        isRealSupabase={isRealSupabase}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Info Banner if in Local Mock mode */}
        {!isRealSupabase && (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-4 py-3 text-xs text-indigo-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>
                <strong>デモ / ローカルモックモード稼働中:</strong>{' '}
                現在ローカル環境で動作しています。本番Supabaseと接続するには右上の「接続設定」をご確認ください。
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="underline hover:text-white font-medium shrink-0 cursor-pointer"
            >
              設定を開く
            </button>
          </div>
        )}

        {/* 2つの独立したAI入力窓口 (2-Column Grid) */}
        <section aria-label="AI入力窓口" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. 新規TODO作成用入力窓 (Stateless) */}
          <AiCreateInput
            onSuccess={handleCreateSuccess}
            onError={(msg, detail) => addToast('error', msg, detail)}
          />

          {/* 2. 既存TODO追加・更新用入力窓 (Contextual) */}
          <AiUpdateInput
            uncompletedTodos={uncompletedTodos}
            onSuccess={handleUpdateSuccess}
            onError={(msg, detail) => addToast('error', msg, detail)}
          />
        </section>

        {/* タスク一覧 & 操作セクション */}
        <section aria-label="リアルタイムTODOリスト">
          <TodoList
            todos={todos}
            loading={loading}
            onToggleComplete={toggleComplete}
            onUpdate={updateTodo}
            onDelete={deleteTodo}
          />
        </section>
      </main>

      {/* Floating Undo Toast */}
      <UndoToast
        action={currentUndo}
        onUndo={executeUndo}
        onDismiss={dismissUndo}
      />

      {/* Settings & SQL Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isRealSupabase={isRealSupabase}
        onResetMockData={handleResetMockData}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Powered by Next.js App Router, Supabase Realtime &amp; Google Gemini 1.5 Flash (Structured Outputs)
          </p>
          <p className="text-slate-600">
            分類: 大学 / サークル / 個人 • 温度: 0.0 • TopP: 0.0
          </p>
        </div>
      </footer>
    </div>
  );
}
