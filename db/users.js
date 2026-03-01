/**
 * users テーブル: LINE userId と Google refresh_token の保存・取得
 * access_token は保存しない（都度 refresh で取得）
 */

const { getPool, isDatabaseConfigured } = require('./connection');

/**
 * LINE userId で refresh_token を取得する
 * @param {string} lineUserId - LINE の userId
 * @returns {Promise<string|null>}
 */
async function getRefreshTokenByLineUserId(lineUserId) {
  if (!isDatabaseConfigured()) return null;
  const pool = getPool();
  if (!pool) return null;
  try {
    const res = await pool.query(
      'SELECT google_refresh_token FROM users WHERE line_user_id = $1',
      [lineUserId]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0].google_refresh_token || null;
  } catch (err) {
    console.error('[DB] getRefreshTokenByLineUserId:', err.message);
    return null;
  }
}

/**
 * ユーザーを登録または refresh_token を更新する（upsert）
 * @param {string} lineUserId
 * @param {string} googleRefreshToken
 */
async function upsertUser(lineUserId, googleRefreshToken) {
  if (!isDatabaseConfigured()) return;
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO users (line_user_id, google_refresh_token)
       VALUES ($1, $2)
       ON CONFLICT (line_user_id)
       DO UPDATE SET google_refresh_token = $2, updated_at = NOW()`,
      [lineUserId, googleRefreshToken]
    );
  } catch (err) {
    console.error('[DB] upsertUser:', err.message);
    throw err;
  }
}

module.exports = {
  getRefreshTokenByLineUserId,
  upsertUser,
};
