import { NextRequest, NextResponse } from 'next/server';
import { generateUpdateTodoWithGemini } from '@/lib/gemini';
import { updateTodoInDb } from '@/lib/supabaseClient';
import { Todo } from '@/types/todo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { todos, prompt, currentDateTime, apiKey } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        { success: false, message: '更新指示テキストが空です' },
        { status: 400 }
      );
    }

    if (!Array.isArray(todos)) {
      return NextResponse.json(
        { success: false, message: '未完了TODOリストが不正です' },
        { status: 400 }
      );
    }

    const refDateTime = currentDateTime || new Date().toISOString();

    // 1. 未完了TODOリスト + 指示 + 基準日時を渡してGeminiを呼び出し
    const aiResult = await generateUpdateTodoWithGemini(todos, prompt.trim(), refDateTime, apiKey);

    // 2. 有効な更新指示でない、または対象タスクが特定できない場合
    if (!aiResult.is_valid_instruction || !aiResult.target_id) {
      return NextResponse.json({
        success: false,
        is_valid_instruction: false,
        message: '該当するタスクが見つかりませんでした',
        aiResult,
      });
    }

    // 3. 対象タスクが存在するかチェック
    const targetTodo = todos.find((t: Todo) => t.id === aiResult.target_id);
    if (!targetTodo) {
      return NextResponse.json({
        success: false,
        is_valid_instruction: false,
        message: '該当するタスクが見つかりませんでした（ID不一致）',
        aiResult,
      });
    }

    // 4. null以外の差分プロパティのみ更新
    const updates: Partial<Pick<Todo, 'title' | 'category' | 'due_date'>> = {};
    if (aiResult.updated_title !== null && aiResult.updated_title.trim() !== '') {
      updates.title = aiResult.updated_title.trim();
    }
    if (aiResult.updated_category !== null) {
      updates.category = aiResult.updated_category;
    }
    if (aiResult.updated_due_date !== null) {
      updates.due_date = aiResult.updated_due_date.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        is_valid_instruction: false,
        message: '変更対象の項目が指定されていません',
        aiResult,
      });
    }

    const updated = await updateTodoInDb(aiResult.target_id, updates);

    return NextResponse.json({
      success: true,
      is_valid_instruction: true,
      updatedTodo: updated,
      previousTodo: targetTodo,
      aiResult,
    });
  } catch (error: unknown) {
    console.error('Error in /api/gemini/update:', error);
    const errorMessage = error instanceof Error ? error.message : '予期せぬエラーが発生しました';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
