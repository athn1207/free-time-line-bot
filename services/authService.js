/**
 * Google OAuth 開始 URL の生成と state の保存
 * LINE の userId と state を紐付けて CSRF 対策
 */

const crypto = require('crypto');
const { saveState } = require('../db/oauthStates');
const { isDatabaseConfigured } = require('../db/connection');

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

/**
 * OAuth 開始用 URL を発行する
 * state を生成して DB に保存し、その state 付きの URL を返す
 * @param {string} lineUserId - LINE の userId
 * @returns {Promise<string|null>} 開始 URL。DB 未設定時は null
 */
async function getOAuthStartUrl(lineUserId) {
  if (!isDatabaseConfigured()) return null;
  const baseUrl = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  if (!baseUrl) {
    console.error('[Auth] BASE_URL が設定されていません');
    return null;
  }
  const state = crypto.randomBytes(24).toString('hex');
  await saveState(state, lineUserId);
  return `${baseUrl}/auth/google?state=${encodeURIComponent(state)}`;
}

module.exports = {
  getOAuthStartUrl,
  SCOPE,
};
