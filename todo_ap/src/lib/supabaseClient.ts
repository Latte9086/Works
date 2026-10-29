import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Todo, TodoCategory } from '@/types/todo';
import { mockStore } from './mockStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Fetch all todos
 */
export async function fetchTodosFromDb(): Promise<Todo[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error, falling back to mock store:', error.message);
      return mockStore.getTodos();
    }
    return data as Todo[];
  }
  return mockStore.getTodos();
}

/**
 * Create a new todo
 */
export async function createTodoInDb(
  title: string,
  category: TodoCategory,
  due_date: string | null
): Promise<Todo> {
  const sanitizedDueDate = due_date?.trim() || null;

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('todos')
      .insert([
        {
          title: title.trim(),
          category,
          due_date: sanitizedDueDate,
          is_completed: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert error, falling back to mock store:', error.message);
      return mockStore.createTodo(title, category, sanitizedDueDate);
    }
    return data as Todo;
  }
  return mockStore.createTodo(title, category, sanitizedDueDate);
}

/**
 * Update an existing todo
 */
export async function updateTodoInDb(
  id: string,
  updates: Partial<Pick<Todo, 'title' | 'category' | 'due_date' | 'is_completed'>>
): Promise<Todo | null> {
  if (isSupabaseConfigured() && supabase) {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('todos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Supabase update error, falling back to mock store:', error.message);
      return mockStore.updateTodo(id, updates);
    }
    return data as Todo;
  }
  return mockStore.updateTodo(id, updates);
}

/**
 * Delete a todo
 */
export async function deleteTodoInDb(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete error, falling back to mock store:', error.message);
      return mockStore.deleteTodo(id) !== null;
    }
    return true;
  }
  return mockStore.deleteTodo(id) !== null;
}

/**
 * Restore/Re-insert a full todo object (used for undo)
 */
export async function restoreTodoInDb(todo: Todo): Promise<Todo> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('todos')
      .upsert([todo])
      .select()
      .single();

    if (error) {
      console.warn('Supabase restore error, falling back to mock store:', error.message);
      return mockStore.insertTodoDirect(todo);
    }
    return data as Todo;
  }
  return mockStore.insertTodoDirect(todo);
}
