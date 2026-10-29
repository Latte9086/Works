export type TodoCategory = '大学' | 'サークル' | '個人';

export interface Todo {
  id: string;
  title: string;
  category: TodoCategory;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoAiOutput {
  is_todo: boolean;
  title: string;
  category: TodoCategory;
  due_date: string;
}

export interface UpdateTodoAiOutput {
  is_valid_instruction: boolean;
  target_id: string;
  updated_title: string | null;
  updated_category: TodoCategory | null;
  updated_due_date: string | null;
}

export type UndoActionType = 'complete' | 'uncomplete' | 'create' | 'update' | 'delete';

export interface UndoAction {
  id: string;
  type: UndoActionType;
  description: string;
  previousTodo: Todo;
  currentTodo?: Todo;
  timestamp: number;
}
