/**
 * LINE Webhook ルート
 * POST /webhook で受信し、メッセージが M/D 形式なら空き時間を返す
 * 「連携」で Google OAuth 開始リンクを返す
 */

const express = require('express');
const line = require('@line/bot-sdk');
const { parseDateInput } = require('../utils/dateParser');
const { calculateFreeSlots, formatFreeSlotsText } = require('../utils/freeTimeCalculator');
const calendarService = require('../services/calendarService');
const lineService = require('../services/lineService');
const authService = require('../services/authService');
const { isDatabaseConfigured } = require('../db/connection');

const router = express.Router();

/** 連携開始のキーワード（いずれかで OAuth リンクを返す） */
const LINK_KEYWORDS = ['連携', 'れんけい', '連携する', 'google連携'];

/**
 * LINE の署名検証用ミドルウェア
 */
const lineMiddleware = line.middleware({
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

/**
 * 連携メッセージかどうか
 */
function isLinkRequest(text) {
  const t = (text || '').trim();
  return LINK_KEYWORDS.some((k) => t === k || t.toLowerCase() === k.toLowerCase());
}

/**
 * Webhook 受信（POST /webhook）
 */
router.post('/', lineMiddleware, async (req, res) => {
  res.status(200).end();

  const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
  const events = body?.events || [];
  if (events.length > 0) {
    console.log('[Webhook] イベント受信:', events.length, '件');
  }

  for (const ev of events) {
    if (ev.type !== 'message' || ev.message?.type !== 'text') continue;

    const userId = ev.source?.userId;
    const text = (ev.message.text || '').trim();
    const replyToken = ev.replyToken;
    if (!userId || !replyToken) continue;

    try {
      // 連携キーワード: OAuth 開始リンクを返す
      if (isLinkRequest(text)) {
        if (!isDatabaseConfigured()) {
          await lineService.replyText(
            replyToken,
            '現在は管理者による単一アカウント運用です。マルチユーザー連携をご希望の場合は管理者にご連絡ください。'
          );
          continue;
        }
        const url = await authService.getOAuthStartUrl(userId);
        if (!url) {
          await lineService.replyText(
            replyToken,
            '連携用のリンクを発行できませんでした。BASE_URL と GOOGLE_CLIENT_ID の設定を確認してください。'
          );
          continue;
        }
        const message =
          'Googleカレンダーと連携するには、以下のリンクをブラウザで開き、Googleでログインして「許可」を押してください。\n\n' +
          '（TimeTree を使っている場合は、TimeTree と Google カレンダーを同期したうえで、この連携を行うと空き時間を取得できます）\n\n' +
          url;
        await lineService.replyText(replyToken, message);
        continue;
      }

      // 日付形式なら空き時間を返す
      const date = parseDateInput(text);
      if (!date) {
        await lineService.replyText(
          replyToken,
          '日付を「3/1」のように M/D 形式で送ってください。\nGoogleと連携していない場合は「連携」と送ってください。'
        );
        continue;
      }

      const eventsList = await calendarService.getEventsForDay(userId, date);
      const freeSlots = calculateFreeSlots(date, eventsList);
      const freeText = formatFreeSlotsText(freeSlots);
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const message = `${dateLabel} の空き時間（9:00〜22:00）\n${freeText}`;
      await lineService.replyText(replyToken, message);
    } catch (err) {
      console.error('Webhook handling error:', err);
      const errorMessage = err.message || 'エラーが発生しました。';
      let replyText = `エラー: ${errorMessage}`;
      if (errorMessage.includes('連携されていません') && isDatabaseConfigured()) {
        const url = await authService.getOAuthStartUrl(userId);
        if (url) {
          replyText = `${errorMessage}\n\n以下のリンクから連携してください。\n\n${url}`;
        }
      }
      try {
        await lineService.replyText(replyToken, replyText);
      } catch (replyErr) {
        console.error('Reply error:', replyErr);
      }
    }
  }
});

module.exports = router;
