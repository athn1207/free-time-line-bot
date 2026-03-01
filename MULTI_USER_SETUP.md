# マルチユーザー対応（ユーザー別 Google OAuth）セットアップ

LINE の userId ごとに Google アカウントを紐付け、各自のカレンダーで空き時間を確認できる構成です。  
TimeTree は API を使わず「TimeTree → Google カレンダー同期」前提で、Google カレンダーのみ参照します。

---

## 最初にやること（この順で進める）

| 順番 | やること | どこでやる |
|------|----------|------------|
| **1** | PostgreSQL を 1 つ作る | Render ダッシュボード → **New** → **PostgreSQL** |
| **2** | 作った DB の **Internal Database URL** をコピーする | その PostgreSQL の画面 → **Info** または **Connect** → 「Internal Database URL」をコピー |
| **3** | Web サービスの **Environment** に **DATABASE_URL** と **BASE_URL** を追加する | Render → free-time-line-bot → 左メニュー **Environment** |
| **4** | **GOOGLE_REFRESH_TOKEN** を削除する（マルチでは不要） | 同じく Environment 画面で削除 |
| **5** | 再デプロイする（Deploy） | コードを **push** したあと、Render → **Manual Deploy** → **Deploy latest commit**（手順は下記「push と再デプロイの詳細」） |
| **6** | テーブルを作る | 下記「テーブル作成のやり方」を参照（デプロイ後に実行） |
| **7** | Google Cloud で **リダイレクト URI** を 1 件追加する | 下記「Google Cloud でリダイレクト URI」を参照 |
| **8** | LINE で「連携」と送り、返ってきたリンクから Google 連携して動作確認する | LINE アプリ |

### push と再デプロイの詳細（手順 5）

**A. コードを Git にコミットして push する**

1. **ターミナル（または Cursor のターミナル）を開く。**
2. **プロジェクトフォルダに移動する。**
   ```bash
   cd "C:\Users\あなたのユーザー名\OneDrive\ドキュメント\AIエンジニア\第５章\5-3Googleカレンダー×LINE通知"
   ```
   実際のパスは、このプロジェクトが入っているフォルダに合わせて変更してください。
3. **追加・変更したファイルを確認する。**
   ```bash
   git status
   ```
   `scripts/init-db.js` や、変更したファイルが一覧に出ます。
4. **すべてをステージング（コミット対象にする）する。**
   ```bash
   git add .
   ```
5. **コミットする（コメントは自由でよい）。**
   ```bash
   git commit -m "マルチユーザー用: init-db スクリプト追加"
   ```
6. **GitHub に push する。**
   ```bash
   git push origin master
   ```
   ブランチ名が `main` の場合は次のようにします。
   ```bash
   git push origin main
   ```
   「Everything up-to-date」や、リモートに push された旨の表示が出れば成功です。

**B. Render で再デプロイする**

1. **ブラウザで Render ダッシュボードを開く。**  
   https://dashboard.render.com
2. **一覧から「free-time-line-bot」をクリック**して、その Web サービスの画面を開く。
3. **画面上部の「Manual Deploy」ボタンをクリックする。**  
   （青または黒っぽいボタンで、右側に下向き矢印 ▼ がある場合があります。）
4. **表示されたメニューから「Deploy latest commit」を選ぶ。**  
   これで、いま GitHub に push した最新のコードが Render にデプロイされます。
5. **デプロイが始まる。**  
   画面の「Events」やログエリアに「Deploy started for ...」のような行が出ます。
6. **完了まで待つ（通常 2〜5 分程度）。**  
   - 「Deploy live for ...」と**緑のチェック**が出たら**成功**です。  
   - 「Failed」や赤い表示が出た場合は、**Logs** タブを開いてエラー内容を確認してください（環境変数不足などが多いです）。

ここまで終わったら、次の「テーブル作成のやり方」に進みます。

### テーブル作成のやり方

**※ Render の無料プランでは Shell が使えません。必ず「ローカルで実行」でテーブルを作成してください。**

- **ローカルで実行（無料プランはこちら）**  
  1. Render で **PostgreSQL** の画面を開き、**「External Database URL」** をコピーする。手順は下記「External Database URL の取り方」を参照。  
  2. ローカルの **`.env`** に、次の 1 行を**一時的に**追加する（値は手順 1 でコピーした URL に置き換え）。  
     `DATABASE_URL=postgres://...`  
  3. ターミナルでプロジェクトフォルダに移動し、次を実行する。  
     `node scripts/init-db.js`  
  4. **「テーブル作成完了: users, oauth_states」** と出れば OK。  
  5. 本番では Web サービスの Environment に **Internal** Database URL を設定しているので、ローカル用の `.env` から **DATABASE_URL** の行は削除してかまいません（削除しなくても、本番の Render には影響しません）。

- **方法 A（Render の Shell で実行）**  
  **有料プラン（Starter）の場合のみ利用可能です。** 無料プランでは Shell が使えないため、上記「ローカルで実行」を使ってください。

### External Database URL の取り方（Render の PostgreSQL）

ローカルからテーブルを作るには、**External Database URL**（外部接続用）が必要です。次の手順でコピーします。

1. **ブラウザで Render ダッシュボードを開く**  
   https://dashboard.render.com

2. **PostgreSQL のサービスを開く**  
   - トップページに、Web サービス（free-time-line-bot）と **PostgreSQL**（free-time-line-bot-db など）が並んでいます。  
   - **PostgreSQL のほう**（名前の下に「PostgreSQL」や「Database」と出ているもの）をクリックして開きます。

3. **「Connect」または「Info」を開く**  
   - 開いた PostgreSQL の画面で、左メニューや上部タブに **「Connect」** または **「Info」** があります。  
   - **「Connect」** をクリックすると、接続方法の一覧が表示されます。  
   - **「Info」** の場合は、接続情報が同じ画面か別タブにあります。

4. **「External Database URL」を探す**  
   - 表示されている接続情報のなかで、次のような名前のものを探します。  
     - **「External Database URL」**  
     - **「Connection string (external)」**  
     - **「External connection string」**  
   - **Internal Database URL** という項目もありますが、**こちらは使わないでください**。  
     - Internal は Render のサーバー同士の通信用で、あなたのパソコン（ローカル）からは接続できません。  
   - **External** と書いてあるほうが、インターネット経由でパソコンから接続する用です。

5. **URL をコピーする**  
   - External Database URL の右側にある **「Copy」** ボタンをクリックするか、表示されている `postgres://...` で始まる長い文字列を選択してコピーします。  
   - 例（形式のイメージ）:  
     `postgres://ユーザー名:パスワード@dpg-xxxxx-a.oregon-postgres.render.com/DB名?sslmode=require`  
   - この文字列をそのまま `.env` の `DATABASE_URL=` のうしろに貼り付けます。値の前後にスペースや改行を入れないようにしてください。

### Google Cloud でリダイレクト URI を追加する

1. [Google Cloud Console](https://console.cloud.google.com/) を開く。  
2. **API とサービス** → **認証情報** を開く。  
3. 使っている **OAuth 2.0 クライアント ID**（種類: ウェブアプリケーション）の名前をクリック。  
4. **「承認済みのリダイレクト URI」** の **「URI を追加」** をクリック。  
5. 次の URL を 1 件追加する（あなたのサービス名に合わせて変更）。  
   `https://free-time-line-bot.onrender.com/auth/google/callback`  
6. **保存** をクリック。

---

## 1. 必要な npm パッケージ一覧

| パッケージ | 用途 |
|-----------|------|
| `express` | Web サーバー・ルート |
| `@line/bot-sdk` | LINE Messaging API（Webhook・返信） |
| `googleapis` | Google Calendar API・OAuth |
| `pg` | PostgreSQL 接続（ユーザー別トークン保存） |
| `dotenv` | 開発時の .env 読み込み（本番では未使用） |

追加したのは **pg** のみです。既存の `package.json` に含まれています。

```bash
npm install
```

---

## 2. ディレクトリ構成案

```
プロジェクトルート/
├── index.js                 # エントリーポイント（auth ルート追加）
├── package.json
├── .env                     # 開発用（git に含めない）
├── config/
│   └── constants.js
├── db/
│   ├── connection.js        # PostgreSQL 接続プール
│   ├── schema.sql           # テーブル定義（手動実行）
│   ├── users.js             # users テーブル（refresh_token 保存・取得）
│   └── oauthStates.js       # oauth_states テーブル（state ↔ line_user_id）
├── routes/
│   ├── lineWebhook.js       # POST /webhook（「連携」キーワード・日付処理）
│   └── auth.js              # GET /auth/google, /auth/google/callback
├── services/
│   ├── calendarService.js   # ユーザー別 refresh_token でカレンダー取得
│   ├── lineService.js
│   └── authService.js       # OAuth 開始 URL 生成・state 保存
└── utils/
    ├── dateParser.js
    ├── freeTimeCalculator.js
    └── tokenStore.js        # 従来用（DB 未使用時）
```

---

## 3. DB 接続コード

- **db/connection.js**  
  - `getPool()`: `DATABASE_URL` があれば Pool を返す。本番では SSL 有効。
  - `isDatabaseConfigured()`: DB 利用可否の判定。
  - `testConnection()`: 起動時などの接続テスト用。

接続は「初回利用時」にプールが作成される遅延初期化です。

---

## 4. OAuth 開始 URL 生成コード

- **services/authService.js**
  - `getOAuthStartUrl(lineUserId)`:
    1. ランダムな `state` を生成（CSRF 対策）
    2. `oauth_states` に `(state, line_user_id)` を保存
    3. `BASE_URL` と `GOOGLE_CLIENT_ID` からリダイレクト URL を組み立て
    4. `https://accounts.google.com/o/oauth2/v2/auth?...)` を返す

LINE で「連携」と送ると、この URL が返信され、ユーザーがブラウザで開いて Google ログインします。

---

## 5. Callback 処理コード

- **routes/auth.js**
  - **GET /auth/google?state=xxx**  
    - `state` を検証し、Google の認証画面へリダイレクト（同じ `state` を付与）。
  - **GET /auth/google/callback?code=...&state=...**  
    1. `state` で `oauth_states` から `line_user_id` を取得し、state を削除（1 回限り使用）
    2. `code` で Google にトークンリクエストし、`refresh_token` を取得
    3. `users` に `(line_user_id, google_refresh_token)` を upsert
    4. 「連携が完了しました」の HTML を表示

`access_token` は保存せず、必要なときに `refresh_token` から取得します。

---

## 6. LINE userId と Google アカウント紐付け処理

1. ユーザーが LINE で「連携」と送信
2. Bot が `getOAuthStartUrl(userId)` を呼び、`state` を DB に保存し、URL を返信
3. ユーザーがその URL を開き、Google でログイン・許可
4. Google が `/auth/google/callback?code=...&state=...` にリダイレクト
5. サーバーが `state` から `line_user_id` を取得し、`code` で `refresh_token` を取得
6. `users` に `(line_user_id, google_refresh_token)` を保存
7. 以降、その LINE userId でカレンダー取得時に DB の `refresh_token` を使用

紐付けは **state** によってのみ行い、`state` は 1 回使用後に削除するため、第三者による横取りを防ぎます。

---

## 7. Render での環境変数一覧

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `PORT` | 自動 | Render が設定（通常は変更不要） |
| `NODE_ENV` | 推奨 | `production` にすると dotenv を読まない |
| `LINE_CHANNEL_SECRET` | ○ | LINE Developers の Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | ○ | LINE Developers の Channel access token |
| `BASE_URL` | ○（マルチ時） | 例: `https://あなたのサービス.onrender.com`（末尾スラッシュなし） |
| `GOOGLE_CLIENT_ID` | ○ | Google Cloud の OAuth 2.0 クライアント ID |
| `GOOGLE_CLIENT_SECRET` | ○ | 上記クライアントのシークレット |
| `DATABASE_URL` | ○（マルチ時） | Render の PostgreSQL の「Internal Database URL」 |
| `GOOGLE_CALENDAR_ID` | 任意 | 未設定時は `primary` |

**マルチユーザー運用時:**  
`GOOGLE_REFRESH_TOKEN` は不要です。ユーザーごとの refresh_token が DB の `users` に保存されます。  
単一ユーザー運用（DB なし）のままにする場合は、従来どおり `GOOGLE_REFRESH_TOKEN` を設定できます。

---

## 8. Google Cloud Console 設定手順

1. **プロジェクトを開く**  
   [Google Cloud Console](https://console.cloud.google.com/) で対象プロジェクトを選択。

2. **OAuth 同意画面**  
   - 「API とサービス」→「OAuth 同意画面」  
   - 必要なら「テスト」のまま（利用ユーザーをテストユーザーに追加）。  
   - 本番で一般公開する場合は「公開」に変更し、審査が必要な場合があります。

3. **認証情報**  
   - 「API とサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」  
   - アプリケーションの種類: **ウェブアプリケーション**  
   - 名前: 任意（例: LINE Bot Calendar）  
   - **承認済みのリダイレクト URI** に以下を 1 件追加（Render の URL に合わせて変更）:
     - `https://あなたのサービス.onrender.com/auth/google/callback`  
   - 保存後、**クライアント ID** と **クライアントシークレット** をコピーし、Render の `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` に設定。

4. **スコープ**  
   本アプリでは `https://www.googleapis.com/auth/calendar.readonly` のみを使用します（コード側で指定済み）。

---

## 9. 実装の流れ（初心者向け・番号付き）

### 事前準備（Git・GitHub）

1. コードを GitHub のリポジトリに push 済みであること。
2. Render でそのリポジトリを選んで Web サービスをデプロイ済みであること。

### Render で PostgreSQL を追加

3. Render ダッシュボードで「New」→「PostgreSQL」を選択。
4. リージョンなどを選び、データベースを作成。
5. 作成後、「Connect」などから **Internal Database URL** をコピー（`postgres://...` で始まる文字列）。

### テーブル作成

6. 同じ Render の「Shell」タブを開く（またはローカルから `psql DATABASE_URL` で接続）。
7. プロジェクトの **db/schema.sql** の内容を実行する。  
   - 例: Shell で `psql $DATABASE_URL` のあと、`\i db/schema.sql` や、内容を貼り付けて実行。
8. `users` と `oauth_states` が作成されていることを確認。

### 環境変数を設定

9. Render の Web サービス画面で「Environment」を開く。
10. 次のキーを追加・更新する（値は各自のものに置き換え）:
    - `LINE_CHANNEL_SECRET`
    - `LINE_CHANNEL_ACCESS_TOKEN`
    - `BASE_URL` = `https://あなたのサービス.onrender.com`（スラッシュなし）
    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`
    - `DATABASE_URL` = 手順 5 の Internal Database URL
11. マルチユーザー運用に切り替える場合、**GOOGLE_REFRESH_TOKEN** は削除してよい（ユーザーごとに DB に保存されるため）。

### Google Cloud でリダイレクト URI を登録

12. Google Cloud Console の「認証情報」で、使用中の OAuth 2.0 クライアント ID を編集。
13. 「承認済みのリダイレクト URI」に  
    `https://あなたのサービス.onrender.com/auth/google/callback`  
    を追加して保存。

### デプロイ・動作確認

14. Render で「Manual Deploy」→「Deploy latest commit」を実行（または push で自動デプロイ）。
15. ログに「マルチユーザー: DB 利用（ユーザー別 Google 連携）」が出ていることを確認。
16. LINE で Bot に「連携」と送信し、返ってきた URL をブラウザで開く。
17. Google でログインし、カレンダー閲覧を許可する。
18. 「連携が完了しました」と表示されれば成功。
19. LINE で「3/1」のように日付を送り、空き時間が返ってくることを確認。

### TimeTree 利用者向け案内

20. TimeTree を使っているユーザーには、  
    「TimeTree と Google カレンダーを同期したうえで、Bot で『連携』から同じ Google アカウントを連携してください」と案内する。  
     Bot は Google カレンダーのみ参照するため、TimeTree API は不要です。

---

## セキュリティのポイント

- **state パラメータ**: OAuth 開始時にランダムな `state` を発行し、DB に `(state, line_user_id)` を保存。コールバックで `state` を検証し、一致したら 1 回限り使用して削除。CSRF 対策として有効です。
- **refresh_token のみ DB 保存**: `access_token` は保存せず、必要な都度 `refresh_token` から取得し、メモリ上でキャッシュします。
- **dotenv**: 本番（`NODE_ENV=production`）では `.env` を読み込まないため、Render の環境変数のみが使われます。

---

## トラブルシューティング

- **「連携されていません」と出る**  
  - その LINE ユーザーで「連携」から Google 認証を完了しているか確認。  
  - Render の `DATABASE_URL` と `BASE_URL` が正しいか確認。

- **「無効なリンクです」**  
  - 「連携」で発行された URL をそのまま開いているか確認。  
  - `BASE_URL` が `https://...` で正しく設定されているか確認。

- **「このリンクは既に使用済みか、有効期限が切れています」**  
  - 同じリンクは 1 回しか使えません。LINE で再度「連携」と送り、新しいリンクを取得してください。

- **Google で「リダイレクト URI が一致しない」**  
  - Cloud Console の「承認済みのリダイレクト URI」に  
    `https://あなたのサービス.onrender.com/auth/google/callback`  
    が**完全に一致**して登録されているか確認（スラッシュ・http/https の違いに注意）。

- **DB 接続エラー**  
  - Render の PostgreSQL と Web サービスが同じサービス内にある場合、「Internal Database URL」を使うと接続しやすいです。
