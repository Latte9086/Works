# Mac ANSI Keyboard Switcher (for Rainy 75 Pro)

Rainy 75 Pro 等の ANSI（US配列）キーボードを Mac に USB接続したとき、**スペース左右の Alt（Option）キーをポンと単押しするだけで「英数」と「かな」をワンタッチ切り替え** できるようにする常駐プログラムです。

Rainy 75 Pro を取り外すと自動で機能が解除され、MacBook 本体のキーボードに戻った時も誤動作しません。

---

## 仕組み

- **スペース左の Alt (Option)**: 単体タップで **「英数（英語入力）」**
- **スペース右の Alt (Option)**: 単体タップで **「かな（日本語入力）」**
- **同時押しショートカット時**: `Alt + 何かのキー` を押した時は、通常の Alt（Option）キーとして動作します。
- **自動接続検知**: Rainy 75 Pro の USB 接続・切断を検知し、接続中のみフックを稼働させます。

---

## 必要要件

- macOS 12 Monterey 以降 (macOS 13 Ventura, 14 Sonoma, 15 Sequoia 等)
- Python 3.9 以上

---

## セットアップ手順（Mac 上で実施）

### 1. 依存ライブラリのインストール

ターミナルを開き、本フォルダで以下を実行します。

```bash
pip3 install -r requirements.txt
```

### 2. アクセシビリティ権限の許可（必須）

macOS では、キー入力を監視・変換するために **アクセシビリティ権限** が必要です。

1. Mac の **「システム設定」** を開く。
2. **「プライバシーとセキュリティ」** ＞ **「アクセシビリティ」** を開く。
3. リストに実行するアプリ（例: **「ターミナル」** または **「iTerm2」**）を追加し、スイッチを **ON** にします。

> [!IMPORTANT]
> 権限を許可しないと、プログラム起動時に `Failed to create CGEventTap` というエラーが表示されて動作しません。

---

## 実行方法

```bash
python3 main.py
```

### 実行画面の例

```text
==================================================
  Mac ANSI Keyboard Switcher (for Rainy 75 Pro)   
==================================================
 Target Device: 'Rainy'
 Left  Key    : Alt (Option) -> 英数 (English)
 Right Key    : Alt (Option) -> かな (Japanese)
==================================================
[DeviceMonitor] Monitoring USB devices for 'rainy'...
[DeviceMonitor] Initial status: 'rainy' is CONNECTED.

[System] >>> 'Rainy' is connected. Activating Mac-style IME Switcher...
[KeyHook] Started monitoring: Left Alt (Option) -> Eisu / Right Alt (Option) -> Kana
```

---

## 設定の変更 (`config.json`)

もし「Alt ではなく Win (Command) キーを英数/かなにしたい」場合は、[config.json](file:///c:/Users/latte/mywork/mine/keyborad_changer/config.json) を変更できます。

```json
{
  "target_device_name": "Rainy",
  "left_key": "Option",
  "right_key": "Option"
}
```
- `Option` を `Command` に書き換えると、Windowsキー（Commandキー）が対象になります。

---

## 便利なヒント：Rainy 75 本体のモード切替

Rainy 75 Pro にはハードウェア側でのショートカット機能もあります：
- `Fn + M`: Mac モード
- `Fn + W`: Windows モード

本プログラムはどちらのモードでも利用できますが、Windowsモードのままでスペース横の Alt キーを親指で操作したい場合に最適です。
