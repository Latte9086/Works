import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { CreateTodoAiOutput, UpdateTodoAiOutput, TodoCategory } from '@/types/todo';

export const isGeminiConfigured = (customApiKey?: string): boolean => {
  const key = customApiKey || process.env.GEMINI_API_KEY || '';
  return Boolean(key && key.trim().length > 10 && !key.includes('your-gemini-api-key'));
};

const getGenAIClient = (customApiKey?: string): GoogleGenerativeAI => {
  const key = customApiKey || process.env.GEMINI_API_KEY || '';
  if (!key) {
    throw new Error('GEMINI_API_KEYが設定されていません。.env.local に設定してください。');
  }
  return new GoogleGenerativeAI(key);
};

/**
 * 1. 新規TODO作成用 Gemini 1.5 Flash 呼び出し
 */
export async function generateCreateTodoWithGemini(
  prompt: string,
  currentDateTime: string,
  customApiKey?: string
): Promise<CreateTodoAiOutput> {
  if (!isGeminiConfigured(customApiKey)) {
    // オフライン・モック用フォールバック
    return mockCreateTodoFallback(prompt, currentDateTime);
  }

  const genAI = getGenAIClient(customApiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.0,
      topP: 0.0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          is_todo: {
            type: SchemaType.BOOLEAN,
            description: 'TODOとして有効かどうか。無関係な内容・雑談はfalse',
          },
          title: {
            type: SchemaType.STRING,
            description: '簡潔に要約されたTODOのタイトル',
          },
          category: {
            type: SchemaType.STRING,
            description: 'タスクの分類',
            format: 'enum',
            enum: ['大学', 'サークル', '個人'],
          },
          due_date: {
            type: SchemaType.STRING,
            description:
              "期限。'今日'、'明日'、'YYYY-MM-DD'、'YYYY-MM-DD HH:mm'のいずれか。指定なしは空文字",
          },
        },
        required: ['is_todo', 'title', 'category', 'due_date'],
      },
    },
    systemInstruction:
      'あなたはTODO管理支援AIです。入力がTODOと無関係な場合は is_todo: false を返し、他は空文字にする。' +
      'category は必ず ["大学", "サークル", "個人"] から1つ選択。' +
      'due_date は「今日」「明日」のみ相対表現可。「来週」「今週末」等は提供された [基準日時] から YYYY-MM-DD に変換すること。',
  });

  const content = `[基準日時]: ${currentDateTime}\n[入力テキスト]: ${prompt}`;
  const result = await model.generateContent(content);
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text) as CreateTodoAiOutput;
    // カテゴリが大学・サークル・個人のいずれかに収まっているか安全策
    if (!['大学', 'サークル', '個人'].includes(parsed.category)) {
      parsed.category = '個人';
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', text, err);
    throw new Error('Geminiの出力JSONパースに失敗しました');
  }
}

/**
 * 2. 既存TODO更新用 Gemini 1.5 Flash 呼び出し
 */
export async function generateUpdateTodoWithGemini(
  todos: Array<{ id: string; title: string; category: string; due_date: string | null }>,
  prompt: string,
  currentDateTime: string,
  customApiKey?: string
): Promise<UpdateTodoAiOutput> {
  if (!isGeminiConfigured(customApiKey)) {
    // オフライン・モック用フォールバック
    return mockUpdateTodoFallback(todos, prompt);
  }

  const genAI = getGenAIClient(customApiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.0,
      topP: 0.0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          is_valid_instruction: {
            type: SchemaType.BOOLEAN,
            description: '既存リストに対する有効な更新指示かどうか',
          },
          target_id: {
            type: SchemaType.STRING,
            description: '更新対象TODOのUUID',
          },
          updated_title: {
            type: SchemaType.STRING,
            nullable: true,
          },
          updated_category: {
            type: SchemaType.STRING,
            description: 'タスクの分類',
            format: 'enum',
            enum: ['大学', 'サークル', '個人'],
            nullable: true,
          },
          updated_due_date: {
            type: SchemaType.STRING,
            nullable: true,
          },
        },
        required: ['is_valid_instruction', 'target_id'],
      },
    },
    systemInstruction:
      'あなたはTODO管理支援AIです。提供されたTODOリストから対象タスクを1つ特定し target_id をセット。' +
      '該当なしまたは無関係な指示なら is_valid_instruction: false。' +
      '変更のない項目は null にする。categoryを変更する場合は必ず ["大学", "サークル", "個人"] のいずれかにすること。',
  });

  const content = `[基準日時]: ${currentDateTime}\n[未完了TODOリスト]:\n${JSON.stringify(
    todos,
    null,
    2
  )}\n[入力テキスト]: ${prompt}`;

  const result = await model.generateContent(content);
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text) as UpdateTodoAiOutput;
    if (parsed.updated_category && !['大学', 'サークル', '個人'].includes(parsed.updated_category)) {
      parsed.updated_category = null;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini Update JSON output:', text, err);
    throw new Error('Geminiの出力JSONパースに失敗しました');
  }
}

/**
 * GEMINI_API_KEY未設定時のローカルシミュレーション（即座のUI検証用）
 */
function mockCreateTodoFallback(prompt: string, currentDateTime: string): CreateTodoAiOutput {
  const p = prompt.toLowerCase();
  const isGreetingOrChat = ['こんにちは', 'おはよう', 'こんばんは', '天気', 'テスト', 'hello'].some(
    (w) => p === w || p.startsWith('今日はいい天気')
  );

  if (isGreetingOrChat && !prompt.includes('する') && !prompt.includes('買う') && !prompt.includes('提出')) {
    return {
      is_todo: false,
      title: '',
      category: '個人',
      due_date: '',
    };
  }

  let category: TodoCategory = '個人';
  if (p.includes('大学') || p.includes('レポート') || p.includes('講義') || p.includes('課題') || p.includes('試験')) {
    category = '大学';
  } else if (p.includes('サークル') || p.includes('部活') || p.includes('打ち合わせ') || p.includes('新歓') || p.includes('合宿')) {
    category = 'サークル';
  }

  let due_date = '';
  if (p.includes('今日')) {
    due_date = '今日';
  } else if (p.includes('明日')) {
    due_date = '明日';
  } else if (p.includes('来週') || p.includes('週末')) {
    const d = new Date(currentDateTime || Date.now());
    d.setDate(d.getDate() + 7);
    due_date = d.toISOString().split('T')[0];
  }

  // タイトルのクリーンアップ
  let title = prompt.replace(/(今日|明日|来週まで|期限は).*?(で|に)?/, '').trim();
  if (!title) title = prompt;

  return {
    is_todo: true,
    title,
    category,
    due_date,
  };
}

function mockUpdateTodoFallback(
  todos: Array<{ id: string; title: string; category: string; due_date: string | null }>,
  prompt: string
): UpdateTodoAiOutput {
  if (todos.length === 0) {
    return {
      is_valid_instruction: false,
      target_id: '',
      updated_title: null,
      updated_category: null,
      updated_due_date: null,
    };
  }

  // 簡単なキーワードマッチング
  let matchedTodo = todos.find((t) =>
    prompt.includes(t.title) ||
    t.title.split(' ').some((word) => word.length > 2 && prompt.includes(word))
  );

  // 部分マッチ
  if (!matchedTodo) {
    const tokens = prompt.split(/[のをにへで、\s]+/);
    for (const token of tokens) {
      if (token.length >= 2) {
        matchedTodo = todos.find((t) => t.title.includes(token));
        if (matchedTodo) break;
      }
    }
  }

  if (!matchedTodo) {
    return {
      is_valid_instruction: false,
      target_id: '',
      updated_title: null,
      updated_category: null,
      updated_due_date: null,
    };
  }

  let updated_due_date: string | null = null;
  if (prompt.includes('明日')) updated_due_date = '明日';
  else if (prompt.includes('今日')) updated_due_date = '今日';
  else if (prompt.includes('明後日')) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    updated_due_date = d.toISOString().split('T')[0];
  }

  let updated_category: TodoCategory | null = null;
  if (prompt.includes('大学に') || prompt.includes('大学へ')) updated_category = '大学';
  else if (prompt.includes('サークルに') || prompt.includes('サークルへ')) updated_category = 'サークル';
  else if (prompt.includes('個人に') || prompt.includes('個人へ')) updated_category = '個人';

  let updated_title: string | null = null;
  const titleMatch = prompt.match(/タイトルを?「?([^」]+)」?(に変更|にして)/);
  if (titleMatch) {
    updated_title = titleMatch[1].trim();
  }

  return {
    is_valid_instruction: true,
    target_id: matchedTodo.id,
    updated_title,
    updated_category,
    updated_due_date,
  };
}
