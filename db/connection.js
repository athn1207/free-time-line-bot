/**
 * PostgreSQL 接続プール
 * Render の PostgreSQL は DATABASE_URL で接続情報を渡す
 */

const { Pool } = require('pg');

let pool = null;

/**
 * 接続プールを取得する（未初期化なら DATABASE_URL で作成）
 * @returns {Pool | null} DATABASE_URL が無い場合は null
 */
function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) return null;
  pool = new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  return pool;
}

/**
 * DB が利用可能か
 */
function isDatabaseConfigured() {
  return !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

/**
 * 接続テスト（起動時など）
 */
async function testConnection() {
  const p = getPool();
  if (!p) return false;
  try {
    const client = await p.connect();
    client.release();
    return true;
  } catch (err) {
    console.error('[DB] 接続テスト失敗:', err.message);
    return false;
  }
}

module.exports = {
  getPool,
  isDatabaseConfigured,
  testConnection,
};
