'use client';

import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  CheckSquare,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { Todo, TodoCategory } from '@/types/todo';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  loading: boolean;
  onToggleComplete: (id: string) => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<Todo, 'title' | 'category' | 'due_date' | 'is_completed'>>
  ) => void;
  onDelete: (id: string) => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  loading,
  onToggleComplete,
  onUpdate,
  onDelete,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'すべて' | TodoCategory>('すべて');
  const [statusFilter, setStatusFilter] = useState<'すべて' | '未完了' | '完了済み'>('未完了');
  const [searchQuery, setSearchQuery] = useState('');

  // Statistics
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.is_completed).length;
  const uncompletedCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      // Category filter
      if (selectedCategory !== 'すべて' && todo.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === '未完了' && todo.is_completed) return false;
      if (statusFilter === '完了済み' && !todo.is_completed) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = todo.title.toLowerCase().includes(q);
        const matchDate = (todo.due_date || '').toLowerCase().includes(q);
        const matchCat = todo.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDate && !matchCat) return false;
      }

      return true;
    });
  }, [todos, selectedCategory, statusFilter, searchQuery]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-5 shadow-xl">
      {/* List Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>タスク一覧</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {filteredTodos.length}件
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Supabase Realtimeで購読中・ワンタッチで即時完了
            </p>
          </div>
        </div>

        {/* Progress Bar & Badges */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-300">
              達成率 <span className="text-indigo-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              未完了 {uncompletedCount}
            </span>
            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              完了 {completedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 my-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-x-auto text-xs">
          {(['すべて', '大学', 'サークル', '個人'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
            {(['未完了', 'すべて', '完了済み'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Todo List Items */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">TODOリストを同期中...</p>
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="py-12 px-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
            <Inbox className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-sm font-medium text-slate-300">該当するタスクはありません</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            上のAI入力窓から自然言語で新規タスクを作成するか、検索条件を変更してください
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
