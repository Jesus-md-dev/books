const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  GOOGLE_PLACEHOLDER_SHA256,
  findOpenLibraryCover,
  improveBook,
  isGooglePlaceholder,
  isbnsFromVolume,
  openLibraryCoverUrl,
  resolveGoogleCover,
  searchOpenLibrary,
  withZoom,
} = require('./covers');

const THUMB = 'http://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api';
const BIG = 'https://books.google.com/books/content?id=abc&printsec=frontcover&img=1&zoom=0&edge=curl&source=gbs_api';
const PLACEHOLDER = 'https://i.pinimg.com/placeholder.jpg';

const response = ({ ok = true, status = 200, type = 'image/jpeg', body = Buffer.alloc(50000), json } = {}) => ({
  ok,
  status,
  headers: { get: (name) => (name.toLowerCase() === 'content-type' ? type : null) },
  arrayBuffer: async () => body,
  json: async () => json,
});

// Routes mocked URLs by substring; anything else is a network failure.
const mockFetch = (routes) => {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    const key = Object.keys(routes).find((k) => String(url).includes(k));
    if (!key) throw new Error('fetch failed');
    return routes[key];
  };
  fn.calls = calls;
  return fn;
};

test('withZoom switches the zoom of Google cover URLs and leaves others alone', () => {
  assert.equal(withZoom(THUMB, 0), BIG);
  assert.equal(withZoom('https://books.google.com/books/content?id=abc', 0), 'https://books.google.com/books/content?id=abc&zoom=0');
  assert.equal(withZoom('https://example.com/a.jpg?zoom=1', 0), 'https://example.com/a.jpg?zoom=1');
});

test('detects Google "image not available" by hash, small size or PNG type', () => {
  assert.equal(isGooglePlaceholder({ sha256: GOOGLE_PLACEHOLDER_SHA256, bytes: 99999, contentType: 'image/jpeg' }), true);
  assert.equal(isGooglePlaceholder({ contentType: 'image/png', bytes: 9103 }), true);
  assert.equal(isGooglePlaceholder({ contentType: 'image/jpeg', bytes: 1269 }), true);
  assert.equal(isGooglePlaceholder({ contentType: 'image/jpeg', bytes: 469134 }), false);
});

test('resolveGoogleCover uses zoom=0 when it is a real cover', async () => {
  const fetchImpl = mockFetch({ 'zoom=0': response() });
  assert.equal(await resolveGoogleCover(THUMB, { fetchImpl }), BIG);
});

test('resolveGoogleCover falls back to zoom=1 on the placeholder, errors and HTTP failures', async () => {
  const small = withZoom(THUMB, 1);
  const png = response({ type: 'image/png', body: Buffer.alloc(9103) });
  assert.equal(await resolveGoogleCover(THUMB, { fetchImpl: mockFetch({ 'zoom=0': png }) }), small);
  const hashed = Buffer.from('x');
  assert.notEqual(crypto.createHash('sha256').update(hashed).digest('hex'), GOOGLE_PLACEHOLDER_SHA256);
  assert.equal(await resolveGoogleCover(THUMB, { fetchImpl: mockFetch({}) }), small);
  assert.equal(await resolveGoogleCover(THUMB, { fetchImpl: mockFetch({ 'zoom=0': response({ ok: false, status: 503 }) }) }), small);
});

test('resolveGoogleCover ignores non-Google URLs without fetching', async () => {
  const fetchImpl = mockFetch({});
  assert.equal(await resolveGoogleCover('https://example.com/a.jpg', { fetchImpl }), 'https://example.com/a.jpg');
  assert.equal(fetchImpl.calls.length, 0);
});

test('isbnsFromVolume lists ISBN-13 first and ignores other identifiers', () => {
  const volume = { industryIdentifiers: [
    { type: 'ISBN_10', identifier: '8491297383' },
    { type: 'OTHER', identifier: 'x' },
    { type: 'ISBN_13', identifier: '978-8491297383' },
  ] };
  assert.deepEqual(isbnsFromVolume(volume), ['9788491297383', '8491297383']);
  assert.deepEqual(isbnsFromVolume([]), []);
});

test('findOpenLibraryCover returns the first ISBN with a cover and null on 404', async () => {
  const hit = openLibraryCoverUrl('222');
  const fetchImpl = mockFetch({ '/222-L': response(), '/111-L': response({ ok: false, status: 404, type: null }) });
  assert.equal(await findOpenLibraryCover(['111', '222'], { fetchImpl }), hit);
  assert.equal(await findOpenLibraryCover(['111'], { fetchImpl }), null);
  assert.match(hit, /covers\.openlibrary\.org\/b\/isbn\/222-L\.jpg\?default=false$/);
});

test('searchOpenLibrary reads number_of_pages_median, trying title when the ISBN finds nothing', async () => {
  const empty = response({ json: { docs: [] } });
  const found = response({ json: { docs: [{ number_of_pages_median: 320, isbn: ['9781'] }] } });
  const fetchImpl = mockFetch({ 'isbn=999': empty, 'title=Libro': found });
  assert.deepEqual(await searchOpenLibrary({ isbns: ['999'], title: 'Libro' }, { fetchImpl }), { pages: 320, isbns: ['9781'] });
  assert.deepEqual(await searchOpenLibrary({ title: 'Libro' }, { fetchImpl: mockFetch({}) }), { pages: 0, isbns: [] });
});

test('improveBook upgrades a Google thumbnail and keeps existing pages', async () => {
  const book = { titulo: 'A', imagen: THUMB, n_paginas: 100, volumeInfo: [] };
  const fetchImpl = mockFetch({ 'zoom=0': response() });
  await improveBook(book, { placeholder: PLACEHOLDER, fetchImpl });
  assert.equal(book.imagen, BIG);
  assert.equal(book.n_paginas, 100);
  assert.equal(fetchImpl.calls.length, 1);
});

test('improveBook falls back to Open Library for cover and pages when Google has nothing', async () => {
  const book = {
    titulo: 'Libro', autor: 'Alguien', imagen: PLACEHOLDER, n_paginas: 0,
    volumeInfo: { industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788491297383' }] },
  };
  const fetchImpl = mockFetch({
    '/9788491297383-L': response(),
    'isbn=9788491297383': response({ json: { docs: [{ number_of_pages_median: 288 }] } }),
  });
  await improveBook(book, { placeholder: PLACEHOLDER, fetchImpl });
  assert.equal(book.imagen, openLibraryCoverUrl('9788491297383'));
  assert.equal(book.n_paginas, 288);
});

test('improveBook finds an ISBN through the Open Library search when the book has none', async () => {
  const book = { titulo: 'Libro', autor: 'Desconocido', imagen: PLACEHOLDER, n_paginas: 0, volumeInfo: [] };
  const fetchImpl = mockFetch({
    'title=Libro': response({ json: { docs: [{ number_of_pages_median: 200, isbn: ['555'] }] } }),
    '/555-L': response(),
  });
  await improveBook(book, { placeholder: PLACEHOLDER, fetchImpl });
  assert.equal(book.imagen, openLibraryCoverUrl('555'));
  assert.equal(book.n_paginas, 200);
});

test('improveBook leaves the placeholder when nothing is found and survives network errors', async () => {
  const book = { titulo: 'Libro', imagen: PLACEHOLDER, n_paginas: 0, volumeInfo: [] };
  await improveBook(book, { placeholder: PLACEHOLDER, fetchImpl: mockFetch({}) });
  assert.equal(book.imagen, PLACEHOLDER);
  assert.equal(book.n_paginas, 0);
});

test('improveBook never replaces an override cover or page count', async () => {
  const mine = 'https://example.com/mine.jpg';
  const book = { titulo: 'Libro', imagen: mine, n_paginas: 0, volumeInfo: [] };
  const fetchImpl = mockFetch({ '': response({ json: { docs: [{ number_of_pages_median: 9 }] } }) });
  await improveBook(book, { override: { imagen: mine, n_paginas: 123 }, placeholder: PLACEHOLDER, fetchImpl });
  assert.equal(book.imagen, mine);
  assert.equal(book.n_paginas, 0);
  assert.equal(fetchImpl.calls.length, 0);

  const googleOverride = { titulo: 'L', imagen: THUMB, n_paginas: 5, volumeInfo: [] };
  await improveBook(googleOverride, { override: { imagen: THUMB }, placeholder: PLACEHOLDER, fetchImpl });
  assert.equal(googleOverride.imagen, THUMB);
});
