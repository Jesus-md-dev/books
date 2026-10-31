/**
 * Optional extras of the current book, read from the "Actual" tab:
 *   fecha_reunion  next meeting date (and time), e.g. 14/11/2026 18:30
 *   lugar_reunion  next meeting place, free text
 *   preguntas      discussion questions, one per line (or separated by "|")
 * Pure functions. Missing or empty columns return nothing, never an error.
 */
const { normalizeHeader } = require('./bookCatalog');

const pad = (n) => String(n).padStart(2, '0');

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function isoDate(year, month, day, hour, minute) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  const date = `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
  return hour === undefined ? date : `${date}T${pad(hour)}:${pad(minute)}`;
}

/**
 * Normalizes a meeting date to "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM". Accepts the
 * GViz "Date(2026,10,14)" form, ISO, and day/month/year. Anything else is kept
 * as free text with recognized=false. Empty input returns undefined.
 */
function parseMeetingDate(value) {
  const text = cleanText(value);
  if (!text) return undefined;
  let match = text.match(/^Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+)(?:,\s*\d+)?)?\)$/);
  if (match) {
    const hasTime = match[4] !== undefined && !(Number(match[4]) === 0 && Number(match[5]) === 0);
    const iso = hasTime
      ? isoDate(match[1], Number(match[2]) + 1, match[3], match[4], match[5])
      : isoDate(match[1], Number(match[2]) + 1, match[3]);
    if (iso) return { value: iso, recognized: true };
  }
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?$/);
  if (match) {
    const iso = isoDate(match[1], match[2], match[3], match[4], match[5]);
    if (iso) return { value: iso, recognized: true };
  }
  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[,\s]+(?:a las\s+)?(\d{1,2})[:.](\d{2})(?:\s*h)?)?$/i);
  if (match) {
    const iso = isoDate(match[3], match[2], match[1], match[4], match[5]);
    if (iso) return { value: iso, recognized: true };
  }
  return { value: text, recognized: false };
}

/**
 * Splits the questions cell: one question per line, or separated by "|".
 * Leading numbering or bullets ("1.", "2)", "-", "•") are removed.
 */
function parseQuestions(value) {
  return String(value ?? '')
    .split(/\r?\n|\|/)
    .map((line) => line.replace(/^\s*(?:\d+\s*[.)\-:]|[-•*·–—])\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function findValue(row, names) {
  const entry = Object.entries(row).find(([header]) => names.includes(normalizeHeader(header)));
  return entry ? entry[1] : undefined;
}

/** Returns only the extras that have content; {} when the columns are absent. */
function readCurrentBookInfo(row = {}) {
  const info = {};
  const date = parseMeetingDate(findValue(row, ['fechareunion']));
  if (date) info.fecha_reunion = date.value;
  const place = cleanText(findValue(row, ['lugarreunion']));
  if (place) info.lugar_reunion = place;
  const questions = parseQuestions(findValue(row, ['preguntas']));
  if (questions.length > 0) info.preguntas = questions;
  return info;
}

const INFO_FIELDS = ['fecha_reunion', 'lugar_reunion', 'preguntas'];

/** Sets the extras on the current book and clears stale ones left by a cached copy. */
function applyCurrentBookInfo(book, info = {}, isCurrent = true) {
  INFO_FIELDS.forEach((field) => { delete book[field]; });
  if (isCurrent) INFO_FIELDS.forEach((field) => { if (info[field] !== undefined) book[field] = info[field]; });
  return book;
}

module.exports = { INFO_FIELDS, applyCurrentBookInfo, parseMeetingDate, parseQuestions, readCurrentBookInfo };
