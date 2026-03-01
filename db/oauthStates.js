/**
 * oauth_states テーブル: OAuth 開始時の state（CSRF 対策）と line_user_id の一時保存
 */

const { getPool, isDatabaseConfigured } = require('./connection');

/**
 * state を保存する（OAuth 開始時に呼ぶ）
 * @param {string} state - ランダム文字列
 * @param {string} lineUserId
 */
async function saveState(state, lineUserId) {
  if (!isDatabaseConfigured()) return;
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      'INSERT INTO oauth_states (state, line_user_id) VALUES ($1, $2) ON CONFLICT (state) DO UPDATE SET line_user_id = $2, created_at = NOW()',
      [state, lineUserId]
    );
  } catch (err) {
    console.error('[DB] saveState:', err.message);
    throw err;
  }
}

/**
 * state に紐づく line_user_id を取得し、state を削除する（callback で 1 回だけ使用）
 * @param {string} state
 * @returns {Promise<string|null>}
 */
async function consumeState(state) {
  if (!isDatabaseConfigured()) return null;
  const pool = getPool();
  if (!pool) return null;
  try {
    const res = await pool.query(
      'SELECT line_user_id FROM oauth_states WHERE state = $1',
      [state]
    );
    if (res.rows.length === 0) return null;
    const lineUserId = res.rows[0].line_user_id;
    await pool.query('DELETE FROM oauth_states WHERE state = $1', [state]);
    return lineUserId;
  } catch (err) {
    console.error('[DB] consumeState:', err.message);
    return null;
  }
}

module.exports = {
  saveState,
  consumeState,
};
