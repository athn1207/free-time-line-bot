/**
 * 空き時間計算ロジック
 * 9:00〜22:00 の範囲で、予定と重ならない時間帯を求める
 */

const { CHECK_START_HOUR, CHECK_END_HOUR } = require('../config/constants');

/**
 * 分を "HH:MM" 形式に変換する（例: 540 -> "09:00"）
 * @param {number} totalMinutes - 0:00 からの経過分
 */
function minutesToTimeString(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 予定の開始・終了を「その日の 0:00 からの分」に変換する
 * @param {Date} date - 対象日（時刻は使わず日付だけ）
 * @param {{ start: { dateTime?: string, date?: string }, end: { dateTime?: string, date?: string } }} event - Google Calendar のイベント
 * @returns {{ startMinutes: number, endMinutes: number } | null} 対象日の 9:00〜22:00 と重なる部分のみ。終日や範囲外なら null の可能性
 */
function eventToMinutesOnDay(date, event) {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const baseTime = base.getTime();

  let startDate;
  let endDate;

  if (event.start.dateTime) {
    startDate = new Date(event.start.dateTime);
  } else if (event.start.date) {
    // 終日イベントはその日の 0:00 として扱う
    startDate = new Date(event.start.date + 'T00:00:00+09:00');
  } else {
    return null;
  }

  if (event.end.dateTime) {
    endDate = new Date(event.end.dateTime);
  } else if (event.end.date) {
    endDate = new Date(event.end.date + 'T23:59:59+09:00');
  } else {
    return null;
  }

  const startMinutes = Math.floor((startDate.getTime() - baseTime) / (60 * 1000));
  const endMinutes = Math.floor((endDate.getTime() - baseTime) / (60 * 1000));

  return { startMinutes, endMinutes };
}

/**
 * チェック対象時間帯（9:00〜22:00）でクリップした「予定が入っている区間」の配列を返す
 * @param {Date} date - 対象日
 * @param {Array<{ start: object, end: object }>} events - Google Calendar の events
 * @returns {Array<{ startMinutes: number, endMinutes: number }>}
 */
function getBusyRanges(date, events) {
  const rangeStart = CHECK_START_HOUR * 60;
  const rangeEnd = CHECK_END_HOUR * 60;
  const busy = [];

  for (const event of events) {
    const mins = eventToMinutesOnDay(date, event);
    if (!mins) continue;

    const start = Math.max(mins.startMinutes, rangeStart);
    const end = Math.min(mins.endMinutes, rangeEnd);
    if (start < end) {
      busy.push({ startMinutes: start, endMinutes: end });
    }
  }

  // 重なりをマージ（オーバーラップする区間を結合）
  busy.sort((a, b) => a.startMinutes - b.startMinutes);
  const merged = [];
  for (const b of busy) {
    if (merged.length === 0 || merged[merged.length - 1].endMinutes < b.startMinutes) {
      merged.push({ ...b });
    } else {
      merged[merged.length - 1].endMinutes = Math.max(
        merged[merged.length - 1].endMinutes,
        b.endMinutes
      );
    }
  }

  return merged;
}

/**
 * 空き時間の区間を計算する
 * @param {Date} date - 対象日
 * @param {Array<{ start: object, end: object }>} events - Google Calendar の events
 * @returns {Array<{ start: string, end: string }>} 空き時間の "HH:MM-HH:MM" の配列（start, end を分離した形式）
 */
function calculateFreeSlots(date, events) {
  const rangeStart = CHECK_START_HOUR * 60;
  const rangeEnd = CHECK_END_HOUR * 60;
  const busyRanges = getBusyRanges(date, events);

  const freeSlots = [];
  let current = rangeStart;

  for (const b of busyRanges) {
    if (current < b.startMinutes) {
      freeSlots.push({
        start: minutesToTimeString(current),
        end: minutesToTimeString(b.startMinutes),
      });
    }
    current = Math.max(current, b.endMinutes);
  }

  if (current < rangeEnd) {
    freeSlots.push({
      start: minutesToTimeString(current),
      end: minutesToTimeString(rangeEnd),
    });
  }

  return freeSlots;
}

/**
 * 空き時間を人間が読みやすい1行テキストにフォーマットする
 * @param {Array<{ start: string, end: string }>} slots
 * @returns {string}
 */
function formatFreeSlotsText(slots) {
  if (slots.length === 0) return '空き時間はありません。';
  return slots.map((s) => `${s.start}〜${s.end}`).join('、');
}

module.exports = {
  minutesToTimeString,
  eventToMinutesOnDay,
  getBusyRanges,
  calculateFreeSlots,
  formatFreeSlotsText,
};
