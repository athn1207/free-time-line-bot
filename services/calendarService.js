/**
 * Google Calendar API で予定を取得するサービス
 * ユーザーごとのトークンは tokenStore から取得し、なければ環境変数のフォールバックを使用
 */

const { google } = require('googleapis');
const { getDayBoundsISO } = require('../utils/dateParser');
const { getAccessToken } = require('../utils/tokenStore');

/**
 * 指定日のカレンダー予定を取得する
 * @param {string} userId - LINE の userId（トークン取得のキー）
 * @param {Date} date - 対象日
 * @returns {Promise<Array<{ start: object, end: object }>>} イベント配列
 */
async function getEventsForDay(userId, date) {
  const accessToken = getAccessToken(userId) || process.env.GOOGLE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('このユーザーにはGoogleトークンが設定されていません。');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { timeMin, timeMax } = getDayBoundsISO(date);

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  } catch (err) {
    // トークン期限切れ・無効のときは分かりやすいメッセージにする
    const code = err.code || err.response?.status;
    const msg = (err.message || '').toLowerCase();
    if (code === 401 || (msg.includes('invalid') && msg.includes('credential'))) {
      throw new Error(
        'Googleのアクセストークンの有効期限が切れているか、無効です。.env の GOOGLE_ACCESS_TOKEN を新しいトークンに更新してサーバーを再起動してください。'
      );
    }
    if (code === 403 || msg.includes('insufficient') && msg.includes('permission')) {
      throw new Error(
        'カレンダーを読む権限がありません。OAuth 2.0 Playground で「https://www.googleapis.com/auth/calendar.readonly」にチェックを入れて、もう一度トークンを取得し、.env の GOOGLE_ACCESS_TOKEN を更新してください。'
      );
    }
    throw err;
  }
}

module.exports = {
  getEventsForDay,
};
