-- ユーザー別 Google 連携用テーブル
-- Render の PostgreSQL で実行する（ダッシュボードの Shell または psql）

-- LINE userId と Google refresh_token の紐付け
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  line_user_id VARCHAR(64) NOT NULL UNIQUE,
  google_refresh_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth 開始時の state（CSRF 対策）と LINE userId の一時保存
CREATE TABLE IF NOT EXISTS oauth_states (
  state VARCHAR(64) PRIMARY KEY,
  line_user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 古い state の削除（任意・cron で実行可）
-- DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '10 minutes';
