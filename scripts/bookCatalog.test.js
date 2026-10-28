const test = require('node:test');
const assert = require('node:assert/strict');
const {
  authorMatches,
  catalogTitles,
  createCatalogMap,
  getCatalogAuthor,
  googleBooksQueries,
} = require('./bookCatalog');

test('reads accented spreadsheet headers in title-author-media order', () => {
  const rows = [
    { Título: '  El libro  ', Autor: 'Una Autora', Media: '8.25' },
    { Titulo: 'Otro libro', Autor: 'Otro Autor', Media: '7.50' },
  ];
  const catalog = createCatalogMap(rows);

  assert.deepEqual(catalogTitles(rows), ['El libro', 'Otro libro']);
  assert.equal(getCatalogAuthor('el LIBRO', catalog), 'Una Autora');
  assert.equal(getCatalogAuthor('Otro libro', catalog), 'Otro Autor');
});

test('matches authors without accent differences', () => {
  assert.equal(authorMatches('Camilla Läckberg', ['Camilla Lackberg']), true);
  assert.equal(authorMatches('Camilla Läckberg', ['Otra Autora']), false);
});

test('prioritizes title-and-author searches and does not add ISBN queries', () => {
  const queries = googleBooksQueries('El libro', 'Una Autora');

  assert.equal(queries[0], 'intitle:El libro inauthor:Una Autora');
  assert.ok(queries.includes('El libro Una Autora'));
  assert.ok(queries.includes('El libro'));
  assert.ok(queries.every((query) => !query.includes('isbn:')));
});
