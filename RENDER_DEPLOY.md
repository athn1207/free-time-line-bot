# Render へのデプロイ手順

このドキュメントでは、LINE Bot アプリを Render にデプロイする手順を番号付きで説明します。

---

## 1. 事前に用意するもの

- **GitHub アカウント**（このリポジトリを GitHub にプッシュするため）
- **Render アカウント**（[https://render.com](https://render.com) で無料登録）  
  → 詳しい手順は下の「Render アカウントの作り方」を参照。
- 次の値を控えておく（後で Render の環境変数に入力します）
  - `LINE_CHANNEL_SECRET`（LINE Developers の Basic settings）
  - `LINE_CHANNEL_ACCESS_TOKEN`（LINE Developers の Messaging API タブ）
  - `GOOGLE_ACCESS_TOKEN`（OAuth 2.0 Playground で取得。約1時間で期限切れのため、デプロイ後に再取得して環境変数を更新する場合あり）
  - `GOOGLE_CALENDAR_ID`（任意。指定しない場合は `primary` が使われます）

### Render アカウントの作り方（詳しい手順）

1. **Render のサイトを開く**  
   ブラウザで [https://render.com](https://render.com) を開く。

2. **「Get Started for Free」をクリック**  
   画面右上または中央の **「Get Started for Free」**（無料で始める）をクリックする。

3. **登録方法を選ぶ**  
   - **「Sign up with GitHub」** を選ぶと、GitHub アカウントでそのままログイン・登録できる（おすすめ。あとでリポジトリ連携が簡単）。  
   - **「Sign up with Email」** を選ぶと、メールアドレスとパスワードで新規登録する。  
   - **「Sign up with Google」** で Google アカウントから登録することもできる。

4. **GitHub で登録する場合**  
   - **「Sign up with GitHub」** をクリックする。  
   - GitHub のログイン画面が開いたら、GitHub のユーザー名とパスワード（またはトークン）でログインする。  
   - 「Render がリポジトリ等にアクセスすることを許可しますか？」のような画面が出たら、**「Authorize」**（許可）をクリックする。  
   - これで Render のダッシュボード（[https://dashboard.render.com](https://dashboard.render.com)）が開けば登録完了。

5. **メールで登録する場合**  
   - **「Sign up with Email」** を選び、**Email** と **Password** を入力する。  
   - **「Create Account」** をクリックする。  
   - 登録したメールアドレスに届いた **確認メール** のリンクをクリックして、アカウントを有効化する。  
   - 再度 [https://render.com](https://render.com) にアクセスし、**「Log in」** から同じメール・パスワードでログインする。

6. **ログイン後の確認**  
   画面右上に自分のアイコンやメールが表示され、左側や中央に **「New +」** や **「Dashboard」** があれば、Render アカウントの作成とログインは完了している。  
   この状態で「2. コードを GitHub にプッシュする」以降の手順に進める。

---

## 2. コードを GitHub にプッシュする

1. このプロジェクトを **Git リポジトリ** にする（まだの場合）。
   - プロジェクトのフォルダで `git init` を実行。
2. **.gitignore** に `.env` が含まれていることを確認する（秘密情報を GitHub に上げないため）。  
   - **意味:** `.gitignore` は「Git に含めないファイル」を書くファイルです。ここに `.env` を書いておくと、`.env`（LINE や Google のトークンが入ったファイル）が GitHub にアップロードされず、秘密が漏れません。  
   - **確認のしかた:** プロジェクトのフォルダにある **`.gitignore`** というファイルを開き、中に **`.env`** という 1 行があるか見る。あれば OK。  
   - **無い場合:** `.gitignore` の末尾に改行で **`.env`** と 1 行追加して保存する。
3. **GitHub** で新しいリポジトリを作成する。  
   - [https://github.com/new](https://github.com/new) を開く。  
   - **Repository name** にリポジトリ名を入力（例: `free-time-line-bot`）。  
   - **Public** を選び、**「Create repository」** をクリックする。  
   - 作成後、**「…or push an existing repository from the command line」** のところに表示される URL（`https://github.com/ユーザー名/リポジトリ名.git`）をメモする。次のステップで使う。

4. **「Git のリモート」を追加する**（ローカルのフォルダと GitHub のリポジトリを紐づける）。  
   - **意味:** 「リモート」は「コードを送る先の GitHub の場所」のこと。「origin」はその名前（慣例でよく使う名前）。このコマンドで「origin という名前で、この GitHub の URL にプッシュする」と登録する。  
   - **どこで実行するか:** ターミナル（PowerShell やコマンドプロンプト）を開き、**このプロジェクトのフォルダ**（`index.js` があるフォルダ）に移動してから実行する。  
   - **コマンド:** 次の **1 行** を実行する。`あなたのユーザー名` と `リポジトリ名` は、ステップ 3 で作った GitHub のリポジトリに合わせて書き換える。  
     ```bash
     git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
     ```  
   - **例:** GitHub のユーザー名が `tanaka`、リポジトリ名が `free-time-line-bot` なら、  
     `git remote add origin https://github.com/tanaka/free-time-line-bot.git`  
   - **URL の確認のしかた:** GitHub のリポジトリページを開き、緑色の **「Code」** ボタンをクリック → **「HTTPS」** の欄に表示されている URL の末尾が `.git` で終わっていれば、その URL を `origin` の後ろにそのまま使う。  
   - **すでに origin がある場合:** 「remote origin already exists」と出たら、  
     `git remote set-url origin https://github.com/あなたのユーザー名/リポジトリ名.git`  
     で URL を書き換えられる。

5. **コードを GitHub に送る（プッシュする）。**  
   同じプロジェクトのフォルダで、次の 3 つを **順番に** 実行する。  
   - `git add .`  
   - `git commit -m "Render デプロイ用"`  
   - `git push -u origin main`  
   （ブランチが `master` の場合は `git push -u origin master` にする。）

---

## 3. Render で Web サービスを作成する

1. [https://dashboard.render.com](https://dashboard.render.com) にログインする。
2. **「New +」** をクリックし、**「Web Service」** を選ぶ。
3. **「Connect a repository」** で、先ほどプッシュした **GitHub リポジトリ** を選び、**「Connect」** する。
4. 次のように設定する。

   | 項目 | 入力内容 |
   |------|----------|
   | **Name** | サービス名（例: `free-time-line-bot`）。URL は `https://この名前.onrender.com` になる。 |
   | **Region** | お好みで（例: Singapore で日本に近い）。 |
   | **Branch** | `main`（またはプッシュしているブランチ名）。 |
   | **Runtime** | **Node**。 |
   | **Build Command** | `npm install`（空欄のままでも多くの場合自動で `npm install` が使われる）。 |
   | **Start Command** | `npm start`（または `node index.js`）。 |

5. **「Create Web Service」** はまだ押さない。次のステップで環境変数を設定する。

---

## 4. Render の環境変数を設定する

1. 同じ画面の **「Environment」** セクションまで下にスクロールする。
2. **「Add Environment Variable」** をクリックし、次の変数を **1つずつ** 追加する。

   | Key | Value | 必須 |
   |-----|--------|------|
   | `LINE_CHANNEL_SECRET` | LINE Developers でコピーしたチャネルシークレット | ○ |
   | `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers で発行したチャネルアクセストークン | ○ |
   | `GOOGLE_ACCESS_TOKEN` | OAuth 2.0 Playground で取得したアクセストークン | ○ |
   | `GOOGLE_CALENDAR_ID` | 使うカレンダー ID（省略時は `primary`） | △ |

3. **「Create Web Service」** をクリックしてデプロイを開始する。

---

## 5. デプロイ完了を待つ

1. 画面上で **「Building」** → **「Deploying」** と進むのを待つ。
2. ステータスが **「Live」** になり、**「Your service is live at https://xxxx.onrender.com」** のような URL が表示されたら完了。
3. ブラウザで **`https://あなたのサービス名.onrender.com/health`** を開き、**「OK」** と表示されればサーバーは起動している。

---

## 6. LINE Developers で Webhook URL を変更する

1. [LINE Developers コンソール](https://developers.line.biz/console/) を開く。
2. 使用しているチャネル（例: Schedule Cheak）を開く。
3. **「Messaging API」** タブを開く。
4. **「Webhook URL」** を次の形式に変更する。  
   **`https://あなたのサービス名.onrender.com/webhook`**  
   例: `https://free-time-line-bot.onrender.com/webhook`
5. **「Update」** をクリックして保存する。
6. **「Webhook の利用」** が **オン** になっていることを確認する。

※ これまで ngrok の URL を設定していた場合は、上記の Render の URL に**置き換え**ます。

---

## 7. 動作確認

1. LINE で Bot を友だち追加しているアカウントから、**「3/1」** のように日付を送る。
2. 空き時間が返ってくれば成功。エラーが出た場合は、Render の **「Logs」** タブでエラー内容を確認する。

---

## 環境変数一覧（Render に設定するもの）

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `LINE_CHANNEL_SECRET` | LINE チャネルシークレット（Webhook 署名検証用） | ○ |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE チャネルアクセストークン（返信用） | ○ |
| `GOOGLE_ACCESS_TOKEN` | Google Calendar API 用アクセストークン（約1時間で期限切れ） | ○ |
| `GOOGLE_CALENDAR_ID` | 取得するカレンダー ID（未設定時は `primary`） | △ |
| `PORT` | **設定不要**。Render が自動で割り当てる。 | — |

---

## Webhook パス

- **パス:** `/webhook`
- **LINE の Webhook URL の例:** `https://free-time-line-bot.onrender.com/webhook`

---

## 補足

- **無料プラン**では、しばらくアクセスがないとサービスがスリープします。LINE でメッセージを送った直後は応答が遅く感じることがあります。
- **GOOGLE_ACCESS_TOKEN** は約1時間で期限切れになります。本番で継続して使う場合は、リフレッシュトークンを使う OAuth フローを追加することをおすすめします。
- エラーが出たときは、Render の **「Logs」** タブで `[サーバーエラー]` や `Webhook handling error` の内容を確認してください。
