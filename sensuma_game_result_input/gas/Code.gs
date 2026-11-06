/**
 * Google Apps Script (GAS) 側 受け取り用サンプルコード
 *
 * 【導入手順】
 * 1. Google スプレッドシートを新規作成し、「拡張機能」>「Apps Script」を開く
 * 2. このコードを貼り付けて保存
 * 3. 「デプロイ」>「新しいデプロイ」> 種類「ウェブアプリ」を選択
 *    - 次のユーザーとして実行: 「自分」
 *    - アクセスできるユーザー: 「全員」
 * 4. 発行されたウェブアプリURLを フロントエンドの `.env` (VITE_GAS_URL) または画面右上の「GAS設定」に入力
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. ゲーム単位の詳細シート ("Games")
    var gameSheet = ss.getSheetByName('Games');
    if (!gameSheet) {
      gameSheet = ss.insertSheet('Games');
      gameSheet.appendRow([
        'タイムスタンプ',
        'トーナメントサイド',
        'ラウンド',
        'Player 1',
        'Player 2',
        'P1スコア',
        'P2スコア',
        'セット勝者',
        'Game番号',
        'P1ファイター',
        'P2ファイター',
        'ステージ',
        'Game勝者(P1/P2)',
        'Game勝者名',
      ]);
    }

    var games = payload.games || [];
    games.forEach(function (g) {
      var gameWinnerName =
        g.winner === 'P1'
          ? payload.player1
          : g.winner === 'P2'
          ? payload.player2
          : '';

      gameSheet.appendRow([
        payload.timestamp,
        payload.bracketSide,
        payload.round,
        payload.player1,
        payload.player2,
        payload.p1Score,
        payload.p2Score,
        payload.matchWinner,
        g.gameNumber,
        g.p1Fighter,
        g.p2Fighter,
        g.stage,
        g.winner,
        gameWinnerName,
      ]);
    });

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', gamesSaved: games.length })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

