import { Todo, TodoCategory } from '@/types/todo';

const STORAGE_KEY = 'gemini_todo_app_mock_db';
const BROADCAST_CHANNEL_NAME = 'gemini_todo_realtime';

export type MockRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Todo | null;
  old: Todo | null;
};

const INITIAL_TODOS: Todo[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    title: '線形代数の期末レポート作成',
    category: '大学',
    due_date: '明日',
    is_completed: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    title: '春学期サークル新歓ビラデザイン作成',
    category: 'サークル',
    due_date: '今日',
    is_completed: false,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    title: '常備薬と目薬の買い出し',
    category: '個人',
    due_date: null,
    is_completed: false,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
    title: 'プログラミング演習 第4回提出',
    category: '大学',
    due_date: '2026-10-30',
    is_completed: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

class MockStore {
  private getStorage(): Todo[] {
    if (typeof window === 'undefined') return INITIAL_TODOS;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TODOS));
        return INITIAL_TODOS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TODOS;
    }
  }

  private setStorage(todos: Todo[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  private notify(payload: MockRealtimePayload) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('mock-supabase-realtime', { detail: payload }));
  }

  public getTodos(): Todo[] {
    return this.getStorage().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public createTodo(title: string, category: TodoCategory, due_date: string | null): Todo {
    const todos = this.getStorage();
    const newTodo: Todo = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'mock-' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      category,
      due_date: due_date?.trim() || null,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    todos.unshift(newTodo);
    this.setStorage(todos);
    this.notify({ eventType: 'INSERT', new: newTodo, old: null });
    return newTodo;
  }

  public updateTodo(
    id: string,
    updates: Partial<Pick<Todo, 'title' | 'category' | 'due_date' | 'is_completed'>>
  ): Todo | null {
    const todos = this.getStorage();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const oldTodo = { ...todos[index] };
    const updatedTodo: Todo = {
      ...oldTodo,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    todos[index] = updatedTodo;
    this.setStorage(todos);
    this.notify({ eventType: 'UPDATE', new: updatedTodo, old: oldTodo });
    return updatedTodo;
  }

  public deleteTodo(id: string): Todo | null {
    const todos = this.getStorage();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const deletedTodo = todos[index];
    todos.splice(index, 1);
    this.setStorage(todos);
    this.notify({ eventType: 'DELETE', new: null, old: deletedTodo });
    return deletedTodo;
  }

  public insertTodoDirect(todo: Todo): Todo {
    const todos = this.getStorage();
    const existingIndex = todos.findIndex((t) => t.id === todo.id);
    if (existingIndex >= 0) {
      todos[existingIndex] = todo;
    } else {
      todos.unshift(todo);
    }
    this.setStorage(todos);
    this.notify({ eventType: 'INSERT', new: todo, old: null });
    return todo;
  }

  public subscribe(callback: (payload: MockRealtimePayload) => void) {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<MockRealtimePayload>;
      callback(customEvent.detail);
    };
    window.addEventListener('mock-supabase-realtime', handler);
    return () => {
      window.removeEventListener('mock-supabase-realtime', handler);
    };
  }

  public resetToDefault() {
    this.setStorage(INITIAL_TODOS);
    this.notify({ eventType: 'UPDATE', new: null, old: null });
  }
}

export const mockStore = new MockStore();
