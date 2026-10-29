'use client';

import React, { useState } from 'react';
import {
  Check,
  Calendar,
  Trash2,
  Edit2,
  Clock,
  BookOpen,
  Users,
  User,
  CheckCircle2,
  X,
  Save,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Todo, TodoCategory } from '@/types/todo';

interface TodoItemProps {
  todo: Todo;
  onToggleComplete: (id: string) => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<Todo, 'title' | 'category' | 'due_date' | 'is_completed'>>
  ) => void;
  onDelete: (id: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggleComplete,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editCategory, setEditCategory] = useState<TodoCategory>(todo.category);
  const [editDueDate, setEditDueDate] = useState(todo.due_date || '');

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!todo.is_completed) {
      // 完了時の華やかなコンフェッティ演出
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981'],
      });
    }
    onToggleComplete(todo.id);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    onUpdate(todo.id, {
      title: editTitle.trim(),
      category: editCategory,
      due_date: editDueDate.trim() || null,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setEditCategory(todo.category);
    setEditDueDate(todo.due_date || '');
    setIsEditing(false);
  };

  // Category styles & icons
  const getCategoryConfig = (category: TodoCategory) => {
    switch (category) {
      case '大学':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: BookOpen,
        };
      case 'サークル':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: Users,
        };
      case '個人':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: User,
        };
    }
  };

  const catConfig = getCategoryConfig(todo.category);
  const CategoryIcon = catConfig.icon;

  // Due date highlights
  const isUrgent = todo.due_date === '今日' || todo.due_date === '明日';

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        todo.is_completed
          ? 'bg-slate-900/30 border-slate-800/60 opacity-60'
          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/90 shadow-md hover:shadow-lg'
      }`}
    >
      {isEditing ? (
        // Inline Edit Mode
        <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-indigo-500/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="タスク名"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as TodoCategory)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none"
            >
              <option value="大学">大学</option>
              <option value="サークル">サークル</option>
              <option value="個人">個人</option>
            </select>
            <input
              type="text"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              placeholder="期限 (今日, 明日, YYYY-MM-DD)"
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none flex-1 min-w-[140px]"
            />
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      ) : (
        // Standard View Mode
        <div className="flex items-center justify-between p-3.5 sm:p-4 gap-3">
          {/* One-touch Check Button */}
          <button
            onClick={handleToggle}
            className={`relative flex items-center justify-center w-6 h-6 rounded-lg border transition-all duration-200 cursor-pointer shrink-0 ${
              todo.is_completed
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400 text-white shadow-sm shadow-emerald-500/30'
                : 'border-slate-600 hover:border-indigo-400 hover:bg-indigo-500/10 text-transparent hover:text-indigo-400'
            }`}
            aria-label={todo.is_completed ? '未完了に戻す' : 'タスクを完了にする'}
          >
            <Check className="w-4 h-4 transition-transform duration-200" />
          </button>

          {/* Task Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {/* Category Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${catConfig.bg}`}
              >
                <CategoryIcon className="w-3 h-3" />
                <span>{todo.category}</span>
              </span>

              {/* Due Date Badge */}
              {todo.due_date && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    isUrgent
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                  }`}
                >
                  <Calendar className="w-3 h-3 opacity-70" />
                  <span>{todo.due_date}</span>
                </span>
              )}
            </div>

            {/* Task Title */}
            <p
              className={`text-sm sm:text-base font-normal tracking-wide transition-all ${
                todo.is_completed
                  ? 'line-through text-slate-500 italic'
                  : 'text-slate-100 font-medium'
              }`}
            >
              {todo.title}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="編集"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(todo.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
