const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyCurrentBookInfo, parseMeetingDate, parseQuestions, readCurrentBookInfo,
} = require('./currentBookInfo');

test('normalizes the supported meeting date formats', () => {
  assert.deepEqual(parseMeetingDate('14/11/2026'), { value: '2026-11-14', recognized: true });
  assert.deepEqual(parseMeetingDate('4-1-2027 18:30'), { value: '2027-01-04T18:30', recognized: true });
  assert.deepEqual(parseMeetingDate('2026-11-14'), { value: '2026-11-14', recognized: true });
  assert.deepEqual(parseMeetingDate('Date(2026,10,14)'), { value: '2026-11-14', recognized: true });
  assert.deepEqual(parseMeetingDate('Date(2026,10,14,18,30,0)'), { value: '2026-11-14T18:30', recognized: true });
});

test('keeps unrecognized dates as text and ignores empty ones', () => {
  assert.deepEqual(parseMeetingDate('31/02/2026'), { value: '31/02/2026', recognized: false });
  assert.deepEqual(parseMeetingDate('el último sábado'), { value: 'el último sábado', recognized: false });
  assert.equal(parseMeetingDate('  '), undefined);
  assert.equal(parseMeetingDate(undefined), undefined);
});

test('splits questions by line or pipe and drops numbering', () => {
  assert.deepEqual(parseQuestions('1. ¿Qué os pareció?\n2) ¿El final?\r\n- ¿Lo recomendáis?\n\n'),
    ['¿Qué os pareció?', '¿El final?', '¿Lo recomendáis?']);
  assert.deepEqual(parseQuestions('¿Uno? | ¿Dos?|  '), ['¿Uno?', '¿Dos?']);
  assert.deepEqual(parseQuestions(undefined), []);
  assert.deepEqual(parseQuestions(''), []);
});

test('reads the optional columns by normalized header, nothing when absent', () => {
  assert.deepEqual(readCurrentBookInfo({ actual: 'Libro', autor: 'A' }), {});
  assert.deepEqual(readCurrentBookInfo({ actual: 'Libro', fecha_reunion: '', lugar_reunion: ' ', preguntas: '' }), {});
  assert.deepEqual(
    readCurrentBookInfo({ actual: 'Libro', 'Fecha Reunión': '14/11/2026', lugar_reunion: ' Café  Central ', preguntas: 'a|b' }),
    { fecha_reunion: '2026-11-14', lugar_reunion: 'Café Central', preguntas: ['a', 'b'] },
  );
});

test('applies the extras only to the current book and clears stale ones', () => {
  const stale = { titulo: 'X', lugar_reunion: 'viejo', preguntas: ['p'] };
  assert.deepEqual(applyCurrentBookInfo({ ...stale }, {}, true), { titulo: 'X', actual: true });
  assert.deepEqual(applyCurrentBookInfo({ ...stale }, { lugar_reunion: 'nuevo' }, true), { titulo: 'X', actual: true, lugar_reunion: 'nuevo' });
  assert.deepEqual(applyCurrentBookInfo({ ...stale }, { lugar_reunion: 'nuevo' }, false), { titulo: 'X' });
});

test('flags only the current book and drops a stale flag from a cached copy', () => {
  assert.equal(applyCurrentBookInfo({ titulo: 'X' }, {}, true).actual, true);
  assert.equal('actual' in applyCurrentBookInfo({ titulo: 'X', actual: true }, {}, false), false);
  assert.equal('actual' in applyCurrentBookInfo({ titulo: 'X' }, {}, false), false);
});
