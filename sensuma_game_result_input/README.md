# 対戦結果入力アプリ

対戦結果を入力し、Google Apps ScriptのWebアプリに送信するフォームです。

このフォルダで `npm ci` を実行し、`npm run dev` で起動します。

送信するには、`gas/Code.gs` を使って用意した自分のApps ScriptのWebアプリURLを画面の送信先設定に入力します。`.env.example` を `.env` にコピーして `VITE_GAS_URL` に指定することもできます。
