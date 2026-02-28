/**
 * LINE Webhook ルート
 * POST /webhook で受信し、メッセージが M/D 形式なら空き時間を返す
 */

const express = require('express');
const line = require('@line/bot-sdk');
const { parseDateInput } = require('../utils/dateParser');
const { calculateFreeSlots, formatFreeSlotsText } = require('../utils/freeTimeCalculator');
const calendarService = require('../services/calendarService');
const lineService = require('../services/lineService');

const router = express.Router();

/**
 * LINE の署名検証用ミドルウェア
 * 本番では必ず有効にすること
 */
const lineMiddleware = line.middleware({
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

/**
 * Webhook 受信（POST /webhook）
 * LINE プラットフォームがここにイベントを送る
 */
router.post('/', lineMiddleware, async (req, res) => {
  // 先に 200 を返して LINE のタイムアウトを防ぐ
  res.status(200).end();

  // 署名検証用に生 body で受けているので、ここで JSON にパースする
  const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
  const events = body?.events || [];
  if (events.length > 0) {
    console.log('[Webhook] イベント受信:', events.length, '件');
  }
  for (const ev of events) {
    // メッセージ以外（フォロー、ポストバックなど）は無視
    if (ev.type !== 'message' || ev.message?.type !== 'text') {
      continue;
    }

    const userId = ev.source?.userId;
    const text = (ev.message.text || '').trim();
    const replyToken = ev.replyToken;

    if (!userId || !replyToken) continue;

    try {
      const date = parseDateInput(text);
      if (!date) {
        await lineService.replyText(
          replyToken,
          '日付を「3/1」のように M/D 形式で送ってください。'
        );
        continue;
      }

      // その日の予定を取得
      const eventsList = await calendarService.getEventsForDay(userId, date);

      // 9:00〜22:00 の空き時間を計算
      const freeSlots = calculateFreeSlots(date, eventsList);
      const freeText = formatFreeSlotsText(freeSlots);

      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const message = `${dateLabel} の空き時間（9:00〜22:00）\n${freeText}`;
      await lineService.replyText(replyToken, message);
    } catch (err) {
      console.error('Webhook handling error:', err);
      const errorMessage = err.message || 'エラーが発生しました。';
      try {
        await lineService.replyText(replyToken, `エラー: ${errorMessage}`);
      } catch (replyErr) {
        console.error('Reply error:', replyErr);
      }
    }
  }
});

module.exports = router;
