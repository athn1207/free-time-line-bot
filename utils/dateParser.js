/**
 * 日付パーサー
 * 「3/1」「3/15」のような M/D 形式の文字列を Date に変換する
 */

const { TIMEZONE } = require('../config/constants');

/**
 * M/D または M/D/YYYY 形式の文字列をパースする
 * @param {string} input - ユーザー入力（例: "3/1", "12/25", "3/1/2025"）
 * @returns {Date|null} パースできた場合は Date（タイムゾーン考慮）、失敗時は null
 */
function parseDateInput(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // スラッシュで分割（M/D または M/D/YYYY）
  const parts = trimmed.split('/').map((p) => parseInt(p, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;

  const month = parts[0];
  const day = parts[1];
  const year = parts[2] != null ? parts[2] : new Date().getFullYear();

  // 月は 1〜12
  if (month < 1 || month > 12) return null;
  // 日は 1〜31（簡易チェック）
  if (day < 1 || day > 31) return null;

  // Asia/Tokyo でその日の 0:00 の Date を作成
  // 注意: new Date(year, month-1, day) はローカルタイムゾーンになる
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

/**
 * 指定日付の 0:00 と 23:59:59 を ISO 文字列で返す（Google Calendar API 用）
 * @param {Date} date
 * @returns {{ timeMin: string, timeMax: string }}
 */
function getDayBoundsISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return {
    timeMin: `${y}-${m}-${d}T00:00:00+09:00`,
    timeMax: `${y}-${m}-${d}T23:59:59+09:00`,
  };
}

module.exports = {
  parseDateInput,
  getDayBoundsISO,
};
