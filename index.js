/**
 * 空き時間確認 LINE Bot - エントリーポイント
 * 本番（Render 等）では環境変数を直接読み、開発時のみ .env を読む
 */

// 本番では .env を使わない（Render 等が環境変数を注入する）
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const hasSecret = !!process.env.LINE_CHANNEL_SECRET;
const hasToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!hasSecret || !hasToken) {
  console.error('エラー: LINE の設定がありません。');
  if (process.env.NODE_ENV !== 'production') {
    console.error('  .env に LINE_CHANNEL_SECRET と LINE_CHANNEL_ACCESS_TOKEN を設定してください。');
  } else {
    console.error('  Render の Environment に LINE_CHANNEL_SECRET と LINE_CHANNEL_ACCESS_TOKEN を設定してください。');
  }
  process.exit(1);
}

const hasGoogleRefresh =
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
console.log('Google:', hasGoogleRefresh ? 'リフレッシュトークン利用' : 'GOOGLE_ACCESS_TOKEN または tokenStore を使用');

const express = require('express');
const lineWebhook = require('./routes/lineWebhook');
const authRoutes = require('./routes/auth');
const { isDatabaseConfigured } = require('./db/connection');

// Render は PORT を自動で渡す。未設定時は 3000（ローカル用）
const PORT = process.env.PORT || 3000;
const app = express();

// Webhook パス: POST /webhook（LINE の Webhook URL は https://あなたのサービス.onrender.com/webhook）
app.use('/webhook', (req, res, next) => {
  if (req.method === 'POST') console.log('[Webhook] POST /webhook 受信');
  next();
}, express.raw({ type: 'application/json' }), lineWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Google OAuth 用（マルチユーザー連携）
app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

if (isDatabaseConfigured()) {
  console.log('マルチユーザー: DB 利用（ユーザー別 Google 連携）');
}

app.use((err, req, res, next) => {
  console.error('[サーバーエラー]', err.message || err);
  if (err.stack) console.error(err.stack);
  res.status(500).end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
