'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, TodoCategory, UndoAction } from '@/types/todo';
import {
  isSupabaseConfigured,
  supabase,
  fetchTodosFromDb,
  updateTodoInDb,
  deleteTodoInDb,
  restoreTodoInDb,
  createTodoInDb,
} from '@/lib/supabaseClient';
import { mockStore, MockRealtimePayload } from '@/lib/mockStore';

export function useTodosRealtime() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealSupabase, setIsRealSupabase] = useState(false);
  const [currentUndo, setCurrentUndo] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 初回データ取得 & リアルタイム購読
  useEffect(() => {
    let isMounted = true;
    const isConfigured = isSupabaseConfigured();
    setIsRealSupabase(isConfigured);

    // 1. 初回フェッチ
    fetchTodosFromDb()
      .then((data) => {
        if (isMounted) {
          setTodos(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch todos:', err);
        if (isMounted) {
          setTodos(mockStore.getTodos());
          setLoading(false);
        }
      });

    // 2. リアルタイム購読
    if (isConfigured && supabase) {
      const channel = supabase
        .channel('realtime:todos_app')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'todos' },
          (payload) => {
            if (!isMounted) return;
            const eventType = payload.eventType;

            if (eventType === 'INSERT') {
              const newRow = payload.new as Todo;
              setTodos((prev) => {
                if (prev.some((t) => t.id === newRow.id)) return prev;
                return [newRow, ...prev];
              });
            } else if (eventType === 'UPDATE') {
              const updatedRow = payload.new as Todo;
              setTodos((prev) =>
                prev.map((t) => (t.id === updatedRow.id ? updatedRow : t))
              );
            } else if (eventType === 'DELETE') {
              const oldRow = payload.old as { id: string };
              setTodos((prev) => prev.filter((t) => t.id !== oldRow.id));
            }
          }
        )
        .subscribe((status) => {
          console.log('Supabase Realtime subscription status:', status);
        });

      return () => {
        isMounted = false;
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    } else {
      // モックストアのリアルタイム購読
      const unsubscribe = mockStore.subscribe((payload: MockRealtimePayload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' && payload.new) {
          const newRow = payload.new;
          setTodos((prev) => {
            if (prev.some((t) => t.id === newRow.id)) return prev;
            return [newRow, ...prev];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedRow = payload.new;
          setTodos((prev) =>
            prev.map((t) => (t.id === updatedRow.id ? updatedRow : t))
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const deletedId = payload.old.id;
          setTodos((prev) => prev.filter((t) => t.id !== deletedId));
        }
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }
  }, []);

  // Undoトーストのセットアップヘルパー
  const triggerUndo = useCallback((action: UndoAction) => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setCurrentUndo(action);

    // 7秒後にトーストを自動非表示
    undoTimerRef.current = setTimeout(() => {
      setCurrentUndo(null);
    }, 7000);
  }, []);

  // Undo実行
  const executeUndo = useCallback(async () => {
    if (!currentUndo) return;
    const action = currentUndo;
    setCurrentUndo(null);

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    try {
      if (action.type === 'complete' || action.type === 'uncomplete' || action.type === 'update') {
        // 直前の状態（previousTodo）に復元
        await updateTodoInDb(action.previousTodo.id, {
          title: action.previousTodo.title,
          category: action.previousTodo.category,
          due_date: action.previousTodo.due_date,
          is_completed: action.previousTodo.is_completed,
        });
      } else if (action.type === 'create' && action.currentTodo) {
        // 新規作成を元に戻す = 削除
        await deleteTodoInDb(action.currentTodo.id);
      } else if (action.type === 'delete') {
        // 削除を元に戻す = 再挿入
        await restoreTodoInDb(action.previousTodo);
      }
    } catch (err) {
      console.error('Failed to undo action:', err);
    }
  }, [currentUndo]);

  const dismissUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setCurrentUndo(null);
  }, []);

  // ワンタッチ完了（AIを経由せず即座にDB更新）
  const toggleComplete = useCallback(
    async (id: string) => {
      const target = todos.find((t) => t.id === id);
      if (!target) return;

      const newStatus = !target.is_completed;

      // 楽観的更新
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_completed: newStatus } : t))
      );

      // Undoアクションを記録
      triggerUndo({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        type: newStatus ? 'complete' : 'uncomplete',
        description: `タスク「${target.title}」を${newStatus ? '完了' : '未完了'}にしました`,
        previousTodo: target,
        currentTodo: { ...target, is_completed: newStatus },
        timestamp: Date.now(),
      });

      // DB更新
      await updateTodoInDb(id, { is_completed: newStatus });
    },
    [todos, triggerUndo]
  );

  // 手動更新
  const updateTodo = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Todo, 'title' | 'category' | 'due_date' | 'is_completed'>>
    ) => {
      const target = todos.find((t) => t.id === id);
      if (!target) return;

      // 楽観的更新
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );

      const updated = await updateTodoInDb(id, updates);
      if (updated) {
        triggerUndo({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          type: 'update',
          description: `タスク「${updated.title}」を更新しました`,
          previousTodo: target,
          currentTodo: updated,
          timestamp: Date.now(),
        });
      }
      return updated;
    },
    [todos, triggerUndo]
  );

  // 手動削除
  const deleteTodo = useCallback(
    async (id: string) => {
      const target = todos.find((t) => t.id === id);
      if (!target) return;

      setTodos((prev) => prev.filter((t) => t.id !== id));

      triggerUndo({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        type: 'delete',
        description: `タスク「${target.title}」を削除しました`,
        previousTodo: target,
        timestamp: Date.now(),
      });

      await deleteTodoInDb(id);
    },
    [todos, triggerUndo]
  );

  // 手動作成
  const createTodo = useCallback(
    async (title: string, category: TodoCategory, due_date: string | null) => {
      const newTodo = await createTodoInDb(title, category, due_date);
      setTodos((prev) => {
        if (prev.some((t) => t.id === newTodo.id)) return prev;
        return [newTodo, ...prev];
      });

      triggerUndo({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        type: 'create',
        description: `タスク「${newTodo.title}」を追加しました`,
        previousTodo: newTodo,
        currentTodo: newTodo,
        timestamp: Date.now(),
      });

      return newTodo;
    },
    [triggerUndo]
  );

  return {
    todos,
    loading,
    isRealSupabase,
    toggleComplete,
    updateTodo,
    deleteTodo,
    createTodo,
    currentUndo,
    executeUndo,
    dismissUndo,
    triggerUndo,
    setTodos,
  };
}
