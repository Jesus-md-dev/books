const test = require('node:test');
const assert = require('node:assert/strict');
const { getCurrentBook, getCurrentBookTitle, parseGvizTable } = require('./googleSheets');

test('preserves the first GViz data row and the Libros column headers', () => {
  const rows = parseGvizTable({
    table: {
      cols: [{ label: '' }, { label: 'El libro' }],
      rows: [
        { c: [{ v: 'Ana' }, { v: 8 }] },
        { c: [{ v: 'Luis' }, { v: 9 }] },
      ],
    },
  }, 'Libros');

  assert.deepEqual(rows, [{ '': 'Ana', 'El libro': 8 }, { '': 'Luis', 'El libro': 9 }]);
  assert.deepEqual(rows.sheetHeaders, ['El libro']);
});

test('maps the first Actual column to the actual field without dropping its value', () => {
  const rows = parseGvizTable({
    table: {
      cols: [{ label: '' }],
      rows: [{ c: [{ v: 'Libro actual' }] }],
    },
  }, 'Actual');

  assert.deepEqual(rows, [{ actual: 'Libro actual' }]);
});

test('skips the Actual header row to select the current book title', () => {
  const rows = [
    { actual: 'actual' },
    { actual: 'El lunes nos querrán' },
  ];

  assert.equal(getCurrentBookTitle(rows), 'El lunes nos querrán');
  assert.deepEqual(getCurrentBook(rows), { titulo: 'El lunes nos querrán', autor: '' });
});

test('reads the current title and author from Título and Autor columns', () => {
  const rows = parseGvizTable({
    table: {
      cols: [{ label: 'Título' }, { label: 'Autor' }],
      rows: [{ c: [{ v: 'El lunes nos querrán' }, { v: 'Najat El Hachmi' }] }],
    },
  }, 'Actual');

  assert.deepEqual(getCurrentBook(rows), {
    titulo: 'El lunes nos querrán',
    autor: 'Najat El Hachmi',
  });
});

test('reads Actual rows when GViz does not expose column labels', () => {
  const rows = parseGvizTable({
    table: {
      cols: [{ label: '' }, { label: '' }],
      rows: [
        { c: [{ v: 'Título' }, { v: 'Autor' }] },
        { c: [{ v: 'El lunes nos querrán' }, { v: 'Najat El Hachmi' }] },
      ],
    },
  }, 'Actual');

  assert.deepEqual(getCurrentBook(rows), {
    titulo: 'El lunes nos querrán',
    autor: 'Najat El Hachmi',
  });
});
