import React, { useState } from 'react';
import { Plus, Trash2, Send, Copy, Check, Loader2, Settings } from 'lucide-react';
import {
  BRACKET_SIDES,
  BracketSide,
  ROUNDS,
  STAGES,
} from './constants/smashData';
import { GameResult, MatchPayload, WinnerSide } from './types';
import { FighterSelect } from './components/FighterSelect';

const MAX_GAMES = 5;
const STORAGE_KEY_GAS_URL = 'sensuma_gas_webapp_url';

const createInitialGame = (
  gameNumber: number,
  prevGame?: GameResult
): GameResult => ({
  gameNumber,
  // 2戦目以降は前試合のファイターを引き継ぐことで現場での入力を高速化
  p1Fighter: prevGame ? prevGame.p1Fighter : '',
  p2Fighter: prevGame ? prevGame.p2Fighter : '',
  stage: STAGES[0],
  winner: null,
});

export const App: React.FC = () => {
  // 1. 基本情報ステート
  const [bracketSide, setBracketSide] = useState<BracketSide>('Winners');
  const [round, setRound] = useState<string>(ROUNDS[0]);
  const [player1, setPlayer1] = useState<string>('');
  const [player2, setPlayer2] = useState<string>('');

  // 2. ゲーム結果ステート（デフォルトGame 1のみ、最大5試合）
  const [games, setGames] = useState<GameResult[]>([createInitialGame(1)]);

  // 3. GAS送信先設定・ステータス管理
  const defaultEnvUrl = import.meta.env.VITE_GAS_URL || '';
  const [customGasUrl, setCustomGasUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_GAS_URL) || defaultEnvUrl;
  });
  const [showGasConfig, setShowGasConfig] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // スコア集計
  const p1Score = games.filter((g) => g.winner === 'P1').length;
  const p2Score = games.filter((g) => g.winner === 'P2').length;

  // ゲーム更新ハンドラ
  const updateGame = (index: number, patch: Partial<GameResult>) => {
    setGames((prev) =>
      prev.map((game, i) => (i === index ? { ...game, ...patch } : game))
    );
  };

  // 試合を追加（最大5試合）
  const handleAddGame = () => {
    if (games.length >= MAX_GAMES) return;
    const prevGame = games[games.length - 1];
    setGames((prev) => [...prev, createInitialGame(prev.length + 1, prevGame)]);
  };

  // 試合を削除（最低1試合は残す）
  const handleRemoveGame = (indexToRemove: number) => {
    if (games.length <= 1) return;
    setGames((prev) =>
      prev
        .filter((_, idx) => idx !== indexToRemove)
        .map((g, idx) => ({ ...g, gameNumber: idx + 1 }))
    );
  };

  // 送信用ペイロード生成
  const buildPayload = (): MatchPayload => {
    const matchWinner =
      p1Score > p2Score ? 'P1' : p2Score > p1Score ? 'P2' : 'DRAW';
    return {
      timestamp: new Date().toISOString(),
      bracketSide,
      round,
      player1: player1.trim() || 'Player 1',
      player2: player2.trim() || 'Player 2',
      p1Score,
      p2Score,
      matchWinner,
      games,
    };
  };

  // CSV文字列生成（1ゲーム1行形式）
  const buildCsvString = (): string => {
    const payload = buildPayload();
    const headers = [
      'timestamp',
      'bracketSide',
      'round',
      'player1',
      'player2',
      'gameNumber',
      'p1Fighter',
      'p2Fighter',
      'stage',
      'gameWinner',
      'gameWinnerName',
    ];

    const escapeCsv = (val: string | number | null) => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = payload.games.map((g) => {
      const winnerName =
        g.winner === 'P1'
          ? payload.player1
          : g.winner === 'P2'
          ? payload.player2
          : '';
      return [
        payload.timestamp,
        payload.bracketSide,
        payload.round,
        payload.player1,
        payload.player2,
        g.gameNumber,
        g.p1Fighter,
        g.p2Fighter,
        g.stage,
        g.winner || '',
        winnerName,
      ]
        .map(escapeCsv)
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  // フォームリセット
  const resetForm = () => {
    setPlayer1('');
    setPlayer2('');
    setGames([createInitialGame(1)]);
  };

  // バリデーション
  const validateBeforeSubmit = (): string | null => {
    if (!player1.trim() || !player2.trim()) {
      return 'Player 1 名と Player 2 名を入力してください。';
    }
    for (const g of games) {
      if (!g.p1Fighter || !g.p2Fighter) {
        return `Game ${g.gameNumber} の使用ファイターを選択してください。`;
      }
      if (!g.stage) {
        return `Game ${g.gameNumber} のステージを選択してください。`;
      }
      if (!g.winner) {
        return `Game ${g.gameNumber} の勝者を選択してください。`;
      }
    }
    return null;
  };

  // GASへ送信
  const handleSendToGas = async () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      notify(validationError);
      return;
    }

    const rawUrl = customGasUrl.trim();
    if (!rawUrl) {
      setShowGasConfig(true);
      notify('GAS Web App URLを設定してください。');
      return;
    }

    // デプロイID（AKfyc...）のみが貼られた場合も自動で完全なURLに補完
    const targetUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `https://script.google.com/macros/s/${rawUrl}/exec`;

    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      // CORSプリフライト回避のため Content-Type: text/plain でJSON文字列をPOST
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      notify('送信が完了しました。フォームをリセットしました。');
      resetForm();
    } catch (error) {
      console.error('GAS送信エラー:', error);
      notify('送信に失敗しました。URLまたは通信状況を確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // JSONコピー
  const handleCopyJson = async () => {
    const json = JSON.stringify(buildPayload(), null, 2);
    await navigator.clipboard.writeText(json);
    notify('Copied (JSON)');
  };

  // CSVコピー
  const handleCopyCsv = async () => {
    const csv = buildCsvString();
    await navigator.clipboard.writeText(csv);
    notify('Copied (CSV)');
  };

  // GAS URL保存
  const handleGasUrlChange = (url: string) => {
    setCustomGasUrl(url);
    localStorage.setItem(STORAGE_KEY_GAS_URL, url);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#111827] pb-16">
      {/* シンプルな固定通知バー（トースト） */}
      {feedbackMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-black text-white px-4 py-3 text-sm font-bold border border-black flex items-center justify-between shadow-none">
          <span className=" flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {feedbackMessage}
          </span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline ml-3 shrink-0"
          >
            閉じる
          </button>
        </div>
      )}

      {/* メインコンテナ */}
      <main className="max-w-xl mx-auto px-4 pt-5 space-y-6">
        {/* タイトル & GAS設定トグル */}
        <header className="flex items-center justify-between border-b-2 border-black pb-3">
          <div>
            <h1 className="text-lg font-black tracking-tight text-black uppercase">
              SSBU Match Recorder
            </h1>
            <p className="text-xs text-gray-600">
              大会結果入力フォーム（BO3 / BO5）
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGasConfig((prev) => !prev)}
            className={`px-3 py-2 text-xs font-bold border border-black flex items-center gap-1.5 ${
              showGasConfig
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>GAS設定</span>
          </button>
        </header>

        {/* GAS URL設定欄（開閉式） */}
        {showGasConfig && (
          <section className="bg-white border border-black p-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-black">
              Google Apps Script Web App URL (VITE_GAS_URL)
            </label>
            <input
              type="url"
              value={customGasUrl}
              onChange={(e) => handleGasUrlChange(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-black text-black focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-600">
              ※ 環境変数 <code>VITE_GAS_URL</code> またはここで指定したURLへPOST送信されます（ブラウザに自動保存）。
            </p>
          </section>
        )}

        {/* 1. 基本情報入力エリア */}
        <section className="bg-white border border-black p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-300 pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-black">
              1. Match Info
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 border border-black bg-white text-black">
              {p1Score} - {p2Score}
            </span>
          </div>

          {/* トーナメントサイド選択 & ラウンド選択 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Bracket Side
              </label>
              <div className="grid grid-cols-2 border border-black bg-white">
                {BRACKET_SIDES.map((side) => {
                  const isActive = bracketSide === side;
                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setBracketSide(side)}
                      className={`min-h-[44px] text-sm font-bold transition-none ${
                        isActive
                          ? 'bg-black text-white'
                          : 'bg-white text-black hover:bg-gray-100'
                      } ${side === 'Winners' ? 'border-r border-black' : ''}`}
                    >
                      {side}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="round-select"
                className="block text-xs font-bold uppercase tracking-wider text-black mb-1"
              >
                Round
              </label>
              <select
                id="round-select"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-bold bg-white border border-black text-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                {ROUNDS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Player 1 & Player 2 名入力 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="p1-name"
                className="block text-xs font-bold uppercase tracking-wider text-black mb-1"
              >
                Player 1 Name
              </label>
              <input
                id="p1-name"
                type="text"
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                placeholder="Player 1 名前"
                className="w-full min-h-[46px] px-3 py-2 text-base font-bold bg-white border border-black text-black placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label
                htmlFor="p2-name"
                className="block text-xs font-bold uppercase tracking-wider text-black mb-1"
              >
                Player 2 Name
              </label>
              <input
                id="p2-name"
                type="text"
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                placeholder="Player 2 名前"
                className="w-full min-h-[46px] px-3 py-2 text-base font-bold bg-white border border-black text-black placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </section>

        {/* 2. ゲーム結果入力エリア（BO3 / BO5 対応） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-black">
              2. Games ({games.length} / {MAX_GAMES})
            </h2>
            {games.length < MAX_GAMES && (
              <button
                type="button"
                onClick={handleAddGame}
                className="min-h-[38px] px-3 py-1.5 text-xs font-bold border border-black bg-white text-black hover:bg-black hover:text-white active:bg-black active:text-white flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>試合を追加</span>
              </button>
            )}
          </div>

          {games.map((game, index) => {
            const p1Display = player1.trim() || 'P1';
            const p2Display = player2.trim() || 'P2';
            const isWinnerP1 = game.winner === 'P1';
            const isWinnerP2 = game.winner === 'P2';

            return (
              <div
                key={game.gameNumber}
                className="bg-white border border-black p-4 space-y-4"
              >
                {/* カードヘッダー */}
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <span className="text-base font-black tracking-tight text-black">
                    GAME {game.gameNumber}
                  </span>
                  {games.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGame(index)}
                      className="px-2.5 py-1 text-xs font-bold border border-black bg-white text-black hover:bg-black hover:text-white flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>- 削除</span>
                    </button>
                  )}
                </div>

                {/* ステージ選択 */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Stage（選択ステージ）
                  </label>
                  <select
                    value={game.stage}
                    onChange={(e) =>
                      updateGame(index, { stage: e.target.value })
                    }
                    className="w-full min-h-[46px] px-3 py-2 text-sm font-bold bg-white border border-black text-black focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>

                {/* P1 & P2 使用ファイター選択 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FighterSelect
                    label={`${p1Display} 使用ファイター`}
                    value={game.p1Fighter}
                    onChange={(fighter) =>
                      updateGame(index, { p1Fighter: fighter })
                    }
                  />
                  <FighterSelect
                    label={`${p2Display} 使用ファイター`}
                    value={game.p2Fighter}
                    onChange={(fighter) =>
                      updateGame(index, { p2Fighter: fighter })
                    }
                  />
                </div>

                {/* 勝者選択トグルボタン */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Winner（勝者選択）
                  </label>
                  <div className="grid grid-cols-2 border border-black bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        updateGame(index, {
                          winner: isWinnerP1 ? null : ('P1' as WinnerSide),
                        })
                      }
                      className={`min-h-[48px] px-3 py-2.5 text-sm font-bold border-r border-black truncate ${
                        isWinnerP1
                          ? 'bg-black text-white'
                          : 'bg-white text-black hover:bg-gray-100'
                      }`}
                    >
                      {p1Display} 勝利
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateGame(index, {
                          winner: isWinnerP2 ? null : ('P2' as WinnerSide),
                        })
                      }
                      className={`min-h-[48px] px-3 py-2.5 text-sm font-bold truncate ${
                        isWinnerP2
                          ? 'bg-black text-white'
                          : 'bg-white text-black hover:bg-gray-100'
                      }`}
                    >
                      {p2Display} 勝利
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 下部の「+ 試合を追加」ボタン（スマホでスクロール後にすぐ押せる配置） */}
          {games.length < MAX_GAMES && (
            <button
              type="button"
              onClick={handleAddGame}
              className="w-full min-h-[48px] py-3 text-sm font-bold border border-black bg-white text-black hover:bg-black hover:text-white active:bg-black active:text-white flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ 試合を追加（Game {games.length + 1}）</span>
            </button>
          )}
        </section>

        {/* 3. アクション部（送信・出力） */}
        <section className="bg-white border border-black p-4 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-black border-b border-gray-300 pb-2">
            3. Submit / Export
          </h2>

          {/* GASに送信ボタン */}
          <button
            type="button"
            onClick={handleSendToGas}
            disabled={isSubmitting}
            className="w-full min-h-[52px] px-4 py-3 text-base font-bold bg-black text-white border border-black hover:bg-gray-900 active:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>送信中...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>GASに送信</span>
              </>
            )}
          </button>

          {/* JSONコピー & CSVコピー */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleCopyJson}
              className="min-h-[46px] px-3 py-2.5 text-sm font-bold bg-white text-black border border-black hover:bg-black hover:text-white active:bg-black active:text-white flex items-center justify-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              <span>JSONをコピー</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCsv}
              className="min-h-[46px] px-3 py-2.5 text-sm font-bold bg-white text-black border border-black hover:bg-black hover:text-white active:bg-black active:text-white flex items-center justify-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              <span>CSVをコピー</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;

