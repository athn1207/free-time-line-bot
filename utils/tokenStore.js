/**
 * ユーザーごとのGoogleトークン保存（簡易JSON）
 * 将来 OAuth を入れるときは、このモジュールの実装だけ差し替え可能にする
 */

const fs = require('fs');
const path = require('path');
const { TOKEN_STORE_PATH } = require('../config/constants');

/**
 * 保存ディレクトリがなければ作成する
 */
function ensureDataDir() {
  const dir = path.dirname(TOKEN_STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 全トークンデータを読み込む
 * @returns {Record<string, { accessToken: string, refreshToken?: string, expiry?: number }>}
 */
function loadTokens() {
  ensureDataDir();
  if (!fs.existsSync(TOKEN_STORE_PATH)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(TOKEN_STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * トークンを保存する
 * @param {Record<string, { accessToken: string, refreshToken?: string, expiry?: number }>} data
 */
function saveTokens(data) {
  ensureDataDir();
  fs.writeFileSync(TOKEN_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * ユーザーID（LINEのuserId）に対応するアクセストークンを取得する
 * @param {string} userId - LINE の userId
 * @returns {string|null} アクセストークン。なければ null
 */
function getAccessToken(userId) {
  const data = loadTokens();
  const user = data[userId];
  return user ? user.accessToken : null;
}

/**
 * ユーザーID にトークンを保存する（テスト用固定トークンや、将来 OAuth で取得したトークンを保存）
 * @param {string} userId
 * @param {{ accessToken: string, refreshToken?: string, expiry?: number }} tokens
 */
function setTokens(userId, tokens) {
  const data = loadTokens();
  data[userId] = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiry: tokens.expiry,
  };
  saveTokens(data);
}

module.exports = {
  loadTokens,
  saveTokens,
  getAccessToken,
  setTokens,
};
