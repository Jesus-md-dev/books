const test = require('node:test');
const assert = require('node:assert/strict');
const { isFallbackSheet, applyItemToEntry, matchRuletaCandidates, parseRuletaRows } = require('./ruleta');

const PLACEHOLDER = 'http://placeholder';

test('parses Candidatos rows with tolerant headers, skipping empty and repeated titles', () => {
  const rows = [
    { 'Título': ' Dune ', Autor: 'Frank Herbert' },
    { title: 'Emma', author: '' },
    { Titulo: '' },
    { TITULO: 'dune' },
    { Titulo: 'Solo título' },
  ];
  assert.deepEqual(parseRuletaRows(rows), [
    { titulo: 'Dune', autor: 'Frank Herbert' },
    { titulo: 'Emma', autor: '' },
    { titulo: 'Solo título', autor: '' },
  ]);
  assert.deepEqual(parseRuletaRows([]), []);
  assert.deepEqual(parseRuletaRows(undefined), []);
});

test('reuses known book data by title and reports the ones that need a lookup', () => {
  const known = [
    { titulo: 'dune', autor: 'Frank Herbert', imagen: 'https://img/dune.jpg', n_paginas: 600 },
    { titulo: 'Emma', autor: 'Desconocido', imagen: PLACEHOLDER, n_paginas: 0 },
  ];
  const { entries, missing } = matchRuletaCandidates(
    [{ titulo: 'Dune', autor: '' }, { titulo: 'Emma', autor: 'Jane Austen' }, { titulo: 'Nuevo', autor: '' }],
    known,
    PLACEHOLDER,
  );
  assert.deepEqual(entries[0], { id: 0, titulo: 'Dune', autor: 'Frank Herbert', imagen: 'https://img/dune.jpg', n_paginas: 600 });
  assert.equal(entries[1].imagen, '');
  assert.equal(entries[1].autor, 'Jane Austen');
  assert.deepEqual(missing.map((e) => e.titulo), ['Emma', 'Nuevo']);
});

test('fills an entry from a Google Books item without overwriting the given author', () => {
  const entry = { titulo: 'X', autor: 'Mia', imagen: '', n_paginas: 0 };
  applyItemToEntry(entry, {
    volumeInfo: { authors: ['Otro'], pageCount: 120, imageLinks: { thumbnail: 'http://img/x.jpg' } },
  });
  assert.deepEqual(entry, { titulo: 'X', autor: 'Mia', imagen: 'https://img/x.jpg', n_paginas: 120 });
  applyItemToEntry(entry, undefined);
  assert.equal(entry.imagen, 'https://img/x.jpg');
});

test('falls back to a single free-text column "N. Title - Author"', () => {
  const rows = [
    { '': '1. En la orilla - Rafael Chirbes' },
    { '': '10. La hija del Khan- Marga Bas 🏰' },
    { '': '13. ⁠Dura una eternidad - Anne de Marcken' },
  ];
  assert.deepEqual(parseRuletaRows(rows), [
    { titulo: 'En la orilla', autor: 'Rafael Chirbes' },
    { titulo: 'La hija del Khan', autor: 'Marga Bas' },
    { titulo: 'Dura una eternidad', autor: 'Anne de Marcken' },
  ]);
});

test('detects the first-sheet fallback of a missing tab', () => {
  const medias = [{ Titulo: 'A', Autor: 'B' }];
  assert.equal(isFallbackSheet([{ Titulo: 'A', Autor: 'B' }], medias), true);
  assert.equal(isFallbackSheet([{ '': '1. X - Y' }], medias), false);
  assert.equal(isFallbackSheet([], []), false);
});

test('reads columns by position when gviz returns the header as a data row', () => {
  const rows = [
    { '': 'titulo', column1: 'autor' },
    { '': 'En la orilla', column1: 'Rafael Chirbes' },
    { '': 'Solo titulo' },
  ];
  assert.deepEqual(parseRuletaRows(rows), [
    { titulo: 'En la orilla', autor: 'Rafael Chirbes' },
    { titulo: 'Solo titulo', autor: '' },
  ]);
});
