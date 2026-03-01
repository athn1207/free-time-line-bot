/**
 * マルチユーザー用テーブル（users, oauth_states）を 1 回だけ作成するスクリプト
 * 使い方: DATABASE_URL を設定したうえで node scripts/init-db.js
 * ローカル: .env に DATABASE_URL を書くか、実行時に渡す
 * Render: Shell で DATABASE_URL は既に設定済みなので node scripts/init-db.js
 */

const path = require('path');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const { Pool } = require('pg');
const fs = require('fs');

const url = process.env.DATABASE_URL;
if (!url || !url.trim()) {
  console.error('エラー: DATABASE_URL が設定されていません。');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

async function main() {
  try {
    await pool.query(sql);
    console.log('テーブル作成完了: users, oauth_states');
  } catch (err) {
    console.error('エラー:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
