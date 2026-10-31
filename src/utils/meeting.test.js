import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMeetingDate } from './meeting.js';

test('formats a date and a date with time in Spanish', () => {
  assert.equal(formatMeetingDate('2026-11-14'), 'Sábado, 14 de noviembre de 2026');
  assert.equal(formatMeetingDate('2026-11-14T18:30'), 'Sábado, 14 de noviembre de 2026, 18:30 h');
});

test('shows free text as written and tolerates empty values', () => {
  assert.equal(formatMeetingDate('el último sábado'), 'el último sábado');
  assert.equal(formatMeetingDate(undefined), '');
});
