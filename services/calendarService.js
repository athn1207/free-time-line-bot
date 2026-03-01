/**
 * Google Calendar API で予定を取得するサービス
 * リフレッシュトークンを設定すると、アクセストークンを自動更新して期限切れを防ぐ
 */

const { google } = require('googleapis');
const { getDayBoundsISO } = require('../utils/dateParser');
const { getAccessToken } = require('../utils/tokenStore');

// リフレッシュで取得したアクセストークンをメモリにキャッシュ（プロセス内で有効）
let cachedAccessToken = null;

/**
 * 環境変数からリフレッシュトークンでアクセストークンを取得する（期限切れしない運用用）
 */
async function getAccessTokenViaRefresh() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token;
  } catch (err) {
    console.error('[Google] リフレッシュトークンでアクセストークン取得に失敗:', err.message || err);
    return null;
  }
}

/**
 * 使用するアクセストークンを返す（リフレッシュ設定があればキャッシュ or 取得）
 */
async function resolveAccessToken(userId) {
  const fromStore = getAccessToken(userId);
  if (fromStore) return fromStore;

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    if (cachedAccessToken) return cachedAccessToken;
    cachedAccessToken = await getAccessTokenViaRefresh();
    return cachedAccessToken;
  }

  return process.env.GOOGLE_ACCESS_TOKEN || null;
}

/**
 * 指定日のカレンダー予定を取得する
 */
async function getEventsForDay(userId, date) {
  const accessToken = await resolveAccessToken(userId);
  if (!accessToken) {
    throw new Error(
      'Googleトークンが設定されていません。GOOGLE_ACCESS_TOKEN か、GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN を設定してください。'
    );
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
    const code = err.code || err.response?.status;
    const msg = (err.message || '').toLowerCase();

    if (code === 401 || (msg.includes('invalid') && msg.includes('credential'))) {
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        cachedAccessToken = null;
        const newToken = await getAccessTokenViaRefresh();
        if (newToken) {
          cachedAccessToken = newToken;
          oauth2Client.setCredentials({ access_token: newToken });
          const retry = google.calendar({ version: 'v3', auth: oauth2Client });
          const res = await retry.events.list({
            calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
          });
          return res.data.items || [];
        }
      }
      throw new Error(
        'Googleのアクセストークンの有効期限が切れています。GOOGLE_REFRESH_TOKEN を設定するか、GOOGLE_ACCESS_TOKEN を新しいトークンに更新してください。'
      );
    }
    if (code === 403 || (msg.includes('insufficient') && msg.includes('permission'))) {
      throw new Error(
        'カレンダーを読む権限がありません。OAuth で「https://www.googleapis.com/auth/calendar.readonly」を許可し、リフレッシュトークンを再取得してください。'
      );
    }
    throw err;
  }
}

module.exports = {
  getEventsForDay,
};
