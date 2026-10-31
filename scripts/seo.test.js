const test = require('node:test');
const assert = require('node:assert/strict');
const { bookPath, buildBookJsonLd, buildHeadBlock, buildSitemap, bookDescription } = require('./seo');

const book = {
  titulo: ' Gótico  ', autor: 'Silvia Moreno-Garcia', imagen: 'https://x/y.jpg',
  descripcion: 'Una </script> casa', n_paginas: 300, media: '4.2', n_votos: 3,
  volumeInfo: { industryIdentifiers: [{ type: 'ISBN_13', identifier: '123' }] },
};

test('bookPath trims, collapses spaces and encodes accents', () => {
  assert.equal(bookPath(book), '/libro/G%C3%B3tico');
});

test('JSON-LD has isbn and pages, no aggregateRating, null without author', () => {
  const ld = buildBookJsonLd(book);
  assert.equal(ld.isbn, '123');
  assert.equal(ld.numberOfPages, 300);
  assert.equal(ld.aggregateRating, undefined);
  assert.equal(buildBookJsonLd({ titulo: 'A', autor: 'Desconocido' }), null);
});

test('head block cannot be broken out of by the description', () => {
  const html = buildHeadBlock({ title: 't', description: 'd', url: 'u', image: 'i', type: 'book', jsonLd: buildBookJsonLd(book) });
  const json = html.match(/ld\+json">(.*)<\/script>/)[1];
  assert.equal(JSON.parse(json).name, 'Gótico');
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
});

test('sitemap lists static and book routes once, never /admin', () => {
  const xml = buildSitemap([book, book]);
  assert.equal((xml.match(/<loc>/g) || []).length, 6);
  assert.ok(xml.includes('/libro/G%C3%B3tico'));
  assert.ok(!xml.includes('admin'));
});

test('description falls back when the book has none', () => {
  assert.match(bookDescription({ titulo: 'X', autor: 'Y' }), /X de Y/);
});
