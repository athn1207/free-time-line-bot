/**
 * Google Calendar API で予定を取得するサービス
 * ユーザーごとに DB に保存した refresh_token でアクセストークンを取得する
 */

const { google } = require('googleapis');
const { getDayBoundsISO } = require('../utils/dateParser');
const { getAccessToken } = require('../utils/tokenStore');
const { getRefreshTokenByLineUserId } = require('../db/users');
const { isDatabaseConfigured } = require('../db/connection');

// ユーザー別アクセストークンキャッシュ（メモリのみ・再起動で消える）
const accessTokenCache = new Map();

/**
 * 環境変数のリフレッシュトークンでアクセストークンを取得（従来の単一ユーザー用）
 */
async function getAccessTokenViaEnvRefresh(refreshToken) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
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
 * 使用するアクセストークンを解決する（DB → tokenStore → 環境変数）
 * マルチユーザー時は LINE userId をキーに DB の refresh_token を使用
 */
async function resolveAccessToken(userId) {
  // 1) 従来の tokenStore（開発・移行用）
  const fromStore = getAccessToken(userId);
  if (fromStore) return fromStore;

  // 2) DB にユーザー別 refresh_token がある場合
  if (isDatabaseConfigured()) {
    const cached = accessTokenCache.get(userId);
    if (cached) return cached;
    const refreshToken = await getRefreshTokenByLineUserId(userId);
    if (refreshToken) {
      const accessToken = await getAccessTokenViaEnvRefresh(refreshToken);
      if (accessToken) {
        accessTokenCache.set(userId, accessToken);
        return accessToken;
      }
    }
  }

  // 3) 環境変数で単一ユーザー運用（DB 未使用時）
  const envRefresh = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();
  if (envRefresh) {
    const accessToken = await getAccessTokenViaEnvRefresh(envRefresh);
    if (accessToken) return accessToken;
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
      'Googleと連携されていません。LINEで「連携」と送り、表示されたリンクからGoogleカレンダーを連携してください。'
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
      accessTokenCache.delete(userId);
      if (isDatabaseConfigured()) {
        const refreshToken = await getRefreshTokenByLineUserId(userId);
        if (refreshToken) {
          const newToken = await getAccessTokenViaEnvRefresh(refreshToken);
          if (newToken) {
            accessTokenCache.set(userId, newToken);
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
      }
      const msgMulti =
        'Googleのアクセストークンの有効期限が切れています。LINEで「連携」と送り、再度Googleと連携してください。';
      const msgSingle =
        'Googleのアクセストークンの有効期限が切れています。管理者に .env の GOOGLE_REFRESH_TOKEN（または GOOGLE_ACCESS_TOKEN）の更新を依頼してください。';
      throw new Error(isDatabaseConfigured() ? msgMulti : msgSingle);
    }
    if (code === 403 || (msg.includes('insufficient') && msg.includes('permission'))) {
      throw new Error(
        'カレンダーを読む権限がありません。連携し直す際に「カレンダーの閲覧」を許可してください。'
      );
    }
    throw err;
  }
}

module.exports = {
  getEventsForDay,
};
