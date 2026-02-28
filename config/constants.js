/**
 * アプリ全体で使う定数
 * 時間帯やタイムゾーンをここで一元管理
 */

// 空き時間を確認する時間帯（24時間表記）
const CHECK_START_HOUR = 9;   // 9:00
const CHECK_END_HOUR = 22;    // 22:00

// タイムゾーン（Google Calendar API や日付計算で使用）
const TIMEZONE = 'Asia/Tokyo';

// トークン保存ファイル（簡易JSON保存用）
const TOKEN_STORE_PATH = './data/tokens.json';

module.exports = {
  CHECK_START_HOUR,
  CHECK_END_HOUR,
  TIMEZONE,
  TOKEN_STORE_PATH,
};
