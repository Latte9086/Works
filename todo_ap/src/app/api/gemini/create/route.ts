import { NextRequest, NextResponse } from 'next/server';
import { generateCreateTodoWithGemini } from '@/lib/gemini';
import { createTodoInDb } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, currentDateTime, apiKey } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        { success: false, message: '入力テキストが空です' },
        { status: 400 }
      );
    }

    const refDateTime = currentDateTime || new Date().toISOString();

    // 1. 完全ステートレスにGemini Structured Outputsを呼び出し
    const aiResult = await generateCreateTodoWithGemini(prompt.trim(), refDateTime, apiKey);

    // 2. TODOとして認識できない場合
    if (!aiResult.is_todo || !aiResult.title || aiResult.title.trim() === '') {
      return NextResponse.json({
        success: false,
        is_todo: false,
        message: 'TODOとして認識できませんでした',
        aiResult,
      });
    }

    // 3. DBへ登録（重複排除は行わず常に新規作成）
    const newTodo = await createTodoInDb(
      aiResult.title.trim(),
      aiResult.category,
      aiResult.due_date || null
    );

    return NextResponse.json({
      success: true,
      is_todo: true,
      todo: newTodo,
      aiResult,
    });
  } catch (error: unknown) {
    console.error('Error in /api/gemini/create:', error);
    const errorMessage = error instanceof Error ? error.message : '予期せぬエラーが発生しました';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
