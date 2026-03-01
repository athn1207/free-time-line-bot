/**
 * Google OAuth 2.0 コールバック
 * 認証後に refresh_token を DB に保存し、LINE userId と紐付ける
 */

const express = require('express');
const { google } = require('googleapis');
const { consumeState } = require('../db/oauthStates');
const { upsertUser } = require('../db/users');
const { isDatabaseConfigured } = require('../db/connection');

const router = express.Router();

/**
 * OAuth 開始（LINE から渡された state 付きリンクを開いたとき）
 * state を検証し、Google の認証画面へリダイレクト
 */
router.get('/google', async (req, res) => {
  const state = (req.query.state || '').trim();
  if (!state) {
    return res.status(400).send('無効なリンクです。LINE から「連携」と送って取得したリンクを使ってください。');
  }
  const baseUrl = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const redirectUri = `${baseUrl}/auth/google/callback`;
  if (!clientId || !baseUrl) {
    return res.status(500).send('サーバー設定が不足しています。');
  }
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString()}`;
  res.redirect(authUrl);
});

/**
 * Google から戻ってきたとき（code と state を受け取る）
 * state から line_user_id を取得し、code で refresh_token を取得して DB に保存
 */
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    console.error('[OAuth] Google エラー:', error);
    return res.status(400).send(`認証がキャンセルされたか、エラーが発生しました: ${error}`);
  }
  if (!code || !state) {
    return res.status(400).send('無効なリクエストです。リンクの有効期限が切れている可能性があります。');
  }
  if (!isDatabaseConfigured()) {
    return res.status(500).send('データベースが設定されていません。');
  }
  const lineUserId = await consumeState(state);
  if (!lineUserId) {
    return res.status(400).send('このリンクは既に使用済みか、有効期限が切れています。LINE で「連携」と送り直して、新しいリンクを取得してください。');
  }
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const baseUrl = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  const redirectUri = `${baseUrl}/auth/google/callback`;
  if (!clientId || !clientSecret) {
    return res.status(500).send('サーバー設定が不足しています。');
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  try {
    const { credentials } = await oauth2Client.getToken(code);
    const refreshToken = credentials.refresh_token;
    if (!refreshToken) {
      return res.status(400).send(
        'リフレッシュトークンが取得できませんでした。Google で「許可」を押したうえで、再度お試しください。'
      );
    }
    await upsertUser(lineUserId, refreshToken);
    res.send(
      '<p style="font-family:sans-serif;">Google カレンダーとの連携が完了しました。</p>' +
        '<p>この画面を閉じて、LINE で日付（例: 3/1）を送ると空き時間を確認できます。</p>'
    );
  } catch (err) {
    console.error('[OAuth] トークン取得失敗:', err.message);
    res.status(500).send('トークンの取得に失敗しました。しばらくしてから再度お試しください。');
  }
});

module.exports = router;
