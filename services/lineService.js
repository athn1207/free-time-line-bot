/**
 * LINE への返信を行うサービス
 * Messaging API の reply をラップして使いやすくする
 */

const line = require('@line/bot-sdk');

// 環境変数からクライアントを生成（index.js で .env を読んだ後に利用）
let client = null;

function getClient() {
  if (!client) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const secret = process.env.LINE_CHANNEL_SECRET;
    if (!token || !secret) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN と LINE_CHANNEL_SECRET を設定してください');
    }
    client = new line.Client({ channelAccessToken: token });
  }
  return client;
}

/**
 * テキストで返信する
 * @param {string} replyToken - Webhook で受け取った replyToken
 * @param {string} text - 送るテキスト
 */
async function replyText(replyToken, text) {
  const c = getClient();
  await c.replyMessage(replyToken, { type: 'text', text });
}

module.exports = {
  getClient,
  replyText,
};
