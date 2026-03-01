# 空き時間確認 LINE Bot

仕事用の少人数向け LINE Bot。Googleカレンダーの予定から **9:00〜22:00** の空き時間を返します。

- **課金なし**で構築（LINE・Google・Render/Railway の無料枠のみ）
- **マルチユーザー対応**: PostgreSQL と `DATABASE_URL` を設定すると、LINE の「連携」でユーザーごとに Google アカウントを紐付け可能（詳細は [MULTI_USER_SETUP.md](./MULTI_USER_SETUP.md)）
- 単一ユーザー時は従来どおり環境変数の `GOOGLE_REFRESH_TOKEN` または tokenStore で運用可能

---

## 設定の流れ（どこからやるか）

| 順番 | やること | どこでやるか |
|------|----------|----------------|
| **1** | LINE のトークン・シークレットを取得 | [LINE Developers](https://developers.line.biz/console/) → プロバイダー／チャネル作成 → **Messaging API** のチャネル → 「チャネルアクセストークン」「チャネルシークレット」をコピー |
| **2** | Google のアクセストークンを取得 | [Google Cloud Console](https://console.cloud.google.com/) → プロジェクト作成 → **Calendar API** を有効化 → **認証情報** → OAuth 2.0 クライアント作成 → 手動でトークン取得（または [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) で Calendar API を選んでトークン取得） |
| **3** | このプロジェクトに環境変数を書く | プロジェクト直下に **`.env`** を作成（`.env.example` をコピーしてリネーム）。中に `LINE_CHANNEL_ACCESS_TOKEN`・`LINE_CHANNEL_SECRET`・`GOOGLE_ACCESS_TOKEN` を貼り付け |
| **4** | ローカルで試す場合 | ターミナルで `npm start`。別ターミナルで **ngrok** などで `https://xxx.ngrok.io` を発行し、LINE Developers の **Webhook URL** に `https://xxx.ngrok.io/webhook` を設定 |
| **5** | 本番で使う場合 | **Render** または **Railway** にデプロイ → 同じく **環境変数** を設定 → 発行された URL を LINE の **Webhook URL** に `https://あなたのURL/webhook` で設定 |

**まとめ:** 設定は「LINE Developers」「Google Cloud Console」「プロジェクトの `.env`」の 3 か所で行います。まずは 1〜3 を済ませて `.env` を用意し、4 か 5 で Webhook を繋げば動きます。

### 1. LINE のトークン・シークレットを取得（詳細手順）

**既に Messaging API のチャネルを持っている場合**  
過去に他の Bot やツール用に作成したチャネルがあれば、そのまま使って大丈夫です。LINE Developers でそのチャネルを開き、下記の「チャネルシークレット」と「チャネルアクセストークン」をコピーして `.env` に設定すれば OK です。新規チャネルを作る必要はありません。

1. **LINE Developers にログイン**  
   [https://developers.line.biz/console/](https://developers.line.biz/console/) を開き、LINE アカウントでログインする。

2. **プロバイダーを作成（まだ持っていない場合）**  
   - 左上の「プロバイダー」一覧で **「Create」** をクリック。  
   - プロバイダー名（例: `My Company`）を入力して作成。  
   - すでにプロバイダーがある場合はそのまま利用してよい。

3. **Messaging API チャネルを作成**  
   - 作成したプロバイダー（または既存のプロバイダー）をクリック。  
   - **「Create a new channel」** をクリック。  
   - **「Messaging API」** を選んで「次へ」。  
   - 画面の流れで **「LINE公式アカウントの作成」** やアカウント種別の選択が出ることがありますが、**そのままで問題ありません**。Messaging API チャネルを作ると、それに紐づく「LINE公式アカウント」（友だち追加される Bot）が一緒に作られます。  
   - 次の項目を入力する：  
     - **Channel name**: Bot の名前（例: `空き時間確認Bot`）  
     - **Channel description**: 任意（例: 仕事用空き時間確認）  
     - **Category**: 適当なカテゴリを選択  
     - **Email address**: 自分のメールアドレス  
     - **Privacy policy URL** / **Terms of use URL**: 必須なら適宜 URL を入力（開発・個人利用なら仮の URL でも可）  
   - 規約に同意して **「Create」**。

4. **チャネルシークレットをコピー（どの画面からか）**  
   - **重要:** Channel secret や Basic settings は **LINE Official Account Manager（manager.line.biz）にはありません**。**LINE Developers コンソール**（[https://developers.line.biz/console/](https://developers.line.biz/console/)）で行います。Manager はメッセージ配信やプロフィール編集用、Developers コンソールは Bot 開発用（トークン・Webhook）の別サイトです。  
   - [LINE Developers コンソール](https://developers.line.biz/console/) を開いた状態で、**左上または一覧から「プロバイダー」を選び**、使うプロバイダー名をクリックする。  
   - **チャネル一覧の表示場所:** プロバイダー名をクリックすると、**そのプロバイダーのダッシュボード**が開く。画面の**中央〜やや下**に「チャネル」のセクションがあり、そこに **作成済みのチャネル（チャネル名とタイプ）の一覧** が並ぶ。一覧に表示されているチャネル名をクリックすると、そのチャネルの設定画面（Basic settings など）に移る。  
   - 一覧から **使う Messaging API のチャネル名** をクリックしてチャネルを開く。

   **※ Manager（manager.line.biz）の画面になっている場合**  
   「Schedule Cheak」のような公式アカウントの管理画面（メッセージ作成・分析など）は **LINE Official Account Manager** です。Channel secret や Channel access token は **LINE Developers コンソール**（[developers.line.biz/console/](https://developers.line.biz/console/)）で取得します。ブラウザで **developers.line.biz/console/** を開き、同じ LINE アカウントでログイン → プロバイダー → チャネル一覧 で、同じ名前の Messaging API チャネルを開くと「Basic settings」タブがあります。

   **※ チャネル一覧に作成したチャネルが出てこないとき**  
   - **作成直後なら、すでにそのチャネルの画面にいます。** 「Create」でチャネルを作ると、多くの場合そのチャネルの設定画面にそのまま移ります。画面上部に **「Basic settings」「Messaging API」** というタブがあれば、それがチャネルの中です。そのまま「Basic settings」で Channel secret をコピーして大丈夫です。  
   - 別の画面に移ってしまった場合：**左上のロゴ「LINE Developers」** または **「コンソール」「ホーム」** をクリックしてトップに戻る → 左サイドバーやトップの **「プロバイダー」** を開く → **使ったプロバイダー名** をクリックすると、その下にチャネル一覧が出ます。  
   - それでも出ない場合は、**別のプロバイダー**で作った可能性があります。プロバイダーを切り替えて、各プロバイダーのチャネル一覧を確認してみてください。  
   - チャネルを開くと、画面上部に **「Basic settings」（基本設定）** と **「Messaging API」** などのタブが出る。  
   - **「Basic settings」タブ**をクリックする（最初からこのタブが開いている場合もある）。  
   - ページを下にスクロールすると **「Channel secret」** という項目がある。  
     - すでに文字列が表示されていれば、その右の **「Copy」** ボタンでコピー。  
     - 「Issue」とだけ書いてある場合は **「Issue」** をクリックして発行すると表示されるので、その後 **「Copy」** でコピー。  
   - コピーした値を `.env` の **`LINE_CHANNEL_SECRET`** に貼り付ける。

5. **チャネルアクセストークンを発行・コピー**  
   - 同じチャネルで **「Messaging API」** タブを開く。  
   - 下の方の **「Channel access token」** の **「Issue」** をクリックしてトークンを発行。  
   - 表示された長い文字列を **「Copy」** でコピー。  
   - これが **`LINE_CHANNEL_ACCESS_TOKEN`** に設定する値。  
   - **注意:** このトークンは他人に知られないようにする。`.env` に書いたら Git にコミットしない（`.gitignore` 済み）。

6. **Bot を友だち追加**  
   - **「Messaging API」** タブの **「Bot basic ID」** または **「QR code」** から、自分用の LINE アカウントで Bot を友だち追加する。  
   - これで「3/1」のようにメッセージを送って動作確認できる。

取得した 2 つの値を `.env` に次のように書く：

```env
LINE_CHANNEL_ACCESS_TOKEN=ここにコピーしたアクセストークン
LINE_CHANNEL_SECRET=ここにコピーしたチャネルシークレット
```

### 「メッセージありがとうございます。このアカウントは個別のお問い合わせを受けていません」を出さない

この文言は **LINE 公式アカウントの「応答メッセージ」** がオンになっていると、Bot の返信に加えて表示されます。Webhook だけで返信したい場合は、次のどちらかでオフにします。

1. **LINE Official Account Manager（manager.line.biz）** にログインする。  
2. 左メニュー **「自動応答」** → **「応答メッセージ」** を開く。  
3. **応答メッセージをオフ** にする（または、送るメッセージを空にして保存する）。  

これで、ユーザーが送ったメッセージに対しては **Webhook の返信だけ** が届くようになります。

### Google の「Invalid Credentials」が出るとき（トークン期限切れ）

`.env` の **GOOGLE_ACCESS_TOKEN** は **約1時間で期限切れ** になります。期限切れや無効だと「Invalid Credentials」になります。

**対処:** 新しいアクセストークンを取得して `.env` を更新する。

1. [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) を開く。  
2. 右の「Step 1」で **Calendar API v3** の **https://www.googleapis.com/auth/calendar.readonly** にチェックを入れ、**Authorize APIs** をクリックして Google でログイン・許可する。  
3. 「Step 2」で **Exchange authorization code for tokens** をクリックし、表示された **Access token** をコピーする。  
4. `.env` の **GOOGLE_ACCESS_TOKEN=** の右に貼り付け、保存する。  
5. サーバーを再起動する（`node index.js` を止めてから再度起動）。  

**「アクセスをブロック: 認証エラーです」が出るとき**

OAuth 同意画面が **テスト** モードのとき、ログインする Google アカウントを「テストユーザー」に追加する必要があります。

1. [Google Cloud Console](https://console.cloud.google.com/) を開き、Calendar API を有効にしている **同じプロジェクト** を選択する。  
2. **「API とサービス」** → **「OAuth 同意画面」** を開く。  
3. **「テストユーザー」** の **「+ ADD USERS」**（または「ユーザーを追加」）をクリックする。  
4. **OAuth Playground でログインに使う Gmail アドレス** を 1 件追加して保存する。  
5. 再度 [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) で **Authorize APIs** からやり直す。  

※ 学校や会社の Google アカウントだと管理者の制限でブロックされることがあります。その場合は個人の Gmail で試すか、管理者に確認してください。

**「Insufficient Permission」が出るとき**

トークン取得時に **カレンダーを読むスコープ** を付けていないと出ます。次のスコープを付けて、**最初から** トークンを取り直してください。

1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) を開く。  
2. 右側 **「Step 1」** で、一覧から **「Calendar API v3」** を探す。  
3. **「https://www.googleapis.com/auth/calendar.readonly」** に**だけ**チェックを入れる（他のスコープは外す）。  
4. **「Authorize APIs」** をクリックし、Google でログインして **「許可」** する。  
5. **「Step 2」** で **「Exchange authorization code for tokens」** をクリックし、表示された **Access token** をコピーする。  
6. `.env` の **GOOGLE_ACCESS_TOKEN=** をそのトークンに更新し、サーバーを再起動する。  

※ 以前に別のスコープで許可していると、新しいスコープが付かないことがあります。その場合は Playground で一度 **認証をやり直す**（Authorize APIs からやり直す）必要があります。

※ 本番で運用する場合は、リフレッシュトークンで自動更新する OAuth フローを入れると便利です（README の「OAuth を追加する場合」を参照）。

---

## 1. ディレクトリ構成

```
5-3Googleカレンダー×LINE通知/
├── index.js              # エントリーポイント（Express 起動・ルート紐付け）
├── package.json
├── .env                  # 環境変数（要作成・.gitignore 済み）
├── .env.example          # 環境変数サンプル
├── config/
│   └── constants.js      # 時間帯・タイムゾーン・パスなどの定数
├── routes/
│   └── lineWebhook.js    # LINE Webhook 受信（POST /webhook）
├── services/
│   ├── calendarService.js  # Google Calendar API で予定取得
│   └── lineService.js      # LINE への返信
├── utils/
│   ├── dateParser.js       # M/D 形式の日付パース
│   ├── freeTimeCalculator.js  # 空き時間計算ロジック
│   └── tokenStore.js       # ユーザーごと Google トークン保存（JSON）
├── data/
│   └── tokens.json       # トークン保存先（実行時に自動作成）
└── README.md
```

---

## 2. 必要な npm パッケージ

| パッケージ | 用途 |
|-----------|------|
| `express` | Web サーバー・Webhook 受信 |
| `@line/bot-sdk` | LINE Messaging API（署名検証・reply） |
| `googleapis` | Google Calendar API |
| `dotenv` | 環境変数の読み込み（.env） |

```bash
npm install
```

---

## 3. 環境変数一覧

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ○ | LINE チャネルアクセストークン（Messaging API） |
| `LINE_CHANNEL_SECRET` | ○ | LINE チャネルシークレット（Webhook 署名検証） |
| `GOOGLE_ACCESS_TOKEN` | △ | テスト用の固定アクセストークン（ユーザーごとトークンが無い場合のフォールバック） |
| `BASE_URL` | △ | アプリの URL（OAuth コールバック用・将来用） |
| `PORT` | △ | サーバーポート（デフォルト 3000。Render/Railway は自動設定） |

`.env.example` をコピーして `.env` を作成し、値を設定してください。

**テスト用（全員同じトークン）:** `GOOGLE_ACCESS_TOKEN` だけ設定すれば、全ユーザーでそのトークンのカレンダーを参照します。

**ユーザーごとトークン:** `data/tokens.json` を次の形式で作成すると、LINE の userId ごとに別のカレンダーを参照できます（OAuth 導入前の手動テスト用）。

```json
{
  "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx": {
    "accessToken": "ya29.xxxx..."
  }
}
```

---

## 4. ローカルで動かす

### どのターミナルで何をするか（2つ使います）

| ターミナル | 役割 | 実行するコマンド | 備考 |
|------------|------|------------------|------|
| **ターミナル①** | サーバーを動かす | `node index.js` | 「Server running on port 3000」が出たら成功。**このタブは閉じない・止めない**。 |
| **ターミナル②** | ngrok で URL を公開 | `ngrok http 3000` | 表示された **https://xxxx.ngrok-free.app** をコピー。LINE の Webhook に **そのURL + `/webhook`** を設定。 |

**手順の順番:**

1. **ターミナル①** を開く → プロジェクトのフォルダで **`node index.js`** を実行 → 「Server running on port 3000」を確認。
2. **ターミナル②** を開く（新しいタブや新しいターミナル）→ 同じプロジェクトのフォルダで **`ngrok http 3000`** を実行 → 表示の **Forwarding** の URL（`https://...ngrok-free.app`）をコピー。
3. LINE Developers → 該当チャネル → **Messaging API** タブ → **Webhook URL** に **`https://xxxx.ngrok-free.app/webhook`** を入力して保存。
4. LINE で Bot に「3/1」と送って動作確認。

**注意:** ターミナル② で **`node index.js` は実行しない**（ポートがかぶってエラーになります）。ターミナル② では **ngrok だけ** 実行してください。

**どちらのターミナルか分からなくなったとき**

- **最後の行が「Server running on port 3000」** → サーバー用。ここで Ctrl+C → `node index.js` で再起動する。
- **「Session Status」「Forwarding」「ngrok」** のような表示がある → ngrok 用。触らなくてよい。
- どちらか分からない場合は、**いったん両方のターミナルで Ctrl+C で止める** → 1つ目のターミナルで `node index.js` → 2つ目のターミナルで `ngrok http 3000` とやり直す。

---

1. **LINE Developers** でチャネル作成（Messaging API 有効）、トークンとシークレットを取得。
2. **Google Cloud Console** でプロジェクト作成し、Calendar API を有効。OAuth 2.0 クライアントを作成し、手動でアクセストークンを取得（またはサービスアカウントでテスト）。
3. `.env` に上記を設定。`GOOGLE_ACCESS_TOKEN` を設定するか、後述の「ユーザーごとトークン」を設定。
4. 上記「どのターミナルで何をするか」のとおり、ターミナル①でサーバー、ターミナル②で ngrok を動かし、LINE の Webhook URL に `https://(ngrokのURL)/webhook` を登録。
5. 起動（ターミナル①）:

```bash
node index.js
```

LINE で「3/1」のように送ると、その日の 9:00〜22:00 の空き時間が返ります。

---

## 5. 空き時間計算ロジック（関数分離）

- **`utils/dateParser.js`**  
  - `parseDateInput("3/1")` → `Date`  
  - `getDayBoundsISO(date)` → Google API 用の `timeMin` / `timeMax`

- **`utils/freeTimeCalculator.js`**  
  - `calculateFreeSlots(date, events)` → 空き区間の配列 `[{ start: "09:00", end: "12:00" }, ...]`  
  - `formatFreeSlotsText(slots)` → 「09:00〜12:00、14:00〜22:00」のような1行テキスト  

予定は 9:00〜22:00 でクリップし、重なりをマージした「忙しい区間」の隙間を空き時間として計算しています。

---

## 6. 無料デプロイ手順（Render 想定）

### 6.1 Render の場合

1. [Render](https://render.com) でアカウント作成。
2. **New → Web Service**。Git リポジトリを連携（GitHub など）。
3. 設定例:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Environment** で以下を追加:
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `GOOGLE_ACCESS_TOKEN`（または後からユーザーごとトークンで対応）
5. デプロイ後、表示される URL が `https://xxx.onrender.com`。
6. LINE Developers の Webhook URL に **`https://xxx.onrender.com/webhook`** を設定。
7. **注意:** 無料プランはスリープするため、初回応答が遅くなることがあります。

### 6.2 Railway の場合

1. [Railway](https://railway.app) で GitHub リポジトリを連携。
2. **New Project → Deploy from GitHub** でリポジトリを選択。
3. **Variables** に上記と同じ環境変数を追加。
4. デプロイ後、**Settings → Generate Domain** で URL を発行。
5. LINE の Webhook に **`https://xxx.up.railway.app/webhook`** を設定。

### 6.3 共通

- `PORT` は Render / Railway が自動で渡すため、`index.js` の `process.env.PORT` で問題ありません。
- `data/tokens.json` は **エフェメラル**（再デプロイで消える）ため、本番で永続化する場合は Redis や DB に切り替える必要があります（OAuth 拡張時に対応しやすい設計にしてあります）。

---

## 7. 将来 OAuth を追加する場合の拡張方針

1. **トークン保存**  
   - 現在: `utils/tokenStore.js` が JSON でユーザーごとトークンを保存。  
   - OAuth 時: 同じインターフェース（`getAccessToken(userId)`, `setTokens(userId, tokens)`）を維持し、中身を DB や Redis に差し替え可能。

2. **ルートの追加**  
   - `GET /auth/google` … Google 認証開始（redirect で consent 画面へ）。  
   - `GET /auth/google/callback` … コールバック。トークン取得後 `tokenStore.setTokens(userId, ...)` で保存。  
   - `userId` は LINE の `userId` を紐づけるため、認証フロー前に LINE Login や「連携用リンクを LINE で送る」などで `userId` を確定する必要があります。

3. **calendarService.js**  
   - 変更不要。すでに `getAccessToken(userId)` と `process.env.GOOGLE_ACCESS_TOKEN` のフォールバックで、ユーザーごとトークンを参照しています。OAuth で取得したトークンを `tokenStore` に保存すればそのまま利用可能。

4. **リフレッシュトークン**  
   - `tokenStore` に `refreshToken` を保存し、`calendarService` または専用の `authService` でアクセストークン期限切れ時に refresh する処理を追加。

このように「ルート」「トークン保存」「カレンダー取得」を分離しているので、OAuth 追加時は **認証ルートの追加** と **tokenStore の永続先の変更** が主な変更点になります。
