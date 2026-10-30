/**
 * Cover helpers shared by the build script (fetchBooksData.js) and the Netlify
 * function (netlify/functions/books.js). Pure URL/detection functions plus a few
 * async helpers that take an injectable `fetchImpl` so they can be tested offline.
 *
 * Google Books' `imageLinks.thumbnail` is a 128 px image (zoom=1). zoom=0 gives the
 * full-size cover, but for volumes without a scan Google answers 200 with a grey
 * "image not available" PNG (575x750, 9103 bytes), so the bigger cover must be
 * checked before it is stored. Open Library is the fallback for missing covers
 * and page counts (no API key).
 */
const crypto = require('crypto');

// sha256 of Google's zoom=0 "image not available" PNG.
const GOOGLE_PLACEHOLDER_SHA256 = '3efa8c43e5b4348f303a528c81adf435f0111ea752fe9f0f6241478b60987fa6';
const GOOGLE_COVER_RE = /^https?:\/\/books\.google\.[a-z.]+\/books\/content\?/i;

function isGoogleCoverUrl(url) {
  return typeof url === 'string' && GOOGLE_COVER_RE.test(url);
}

/** Same Google cover URL at another zoom (https). Other URLs come back unchanged. */
function withZoom(url, zoom) {
  if (!isGoogleCoverUrl(url)) return url;
  const https = url.replace(/^http:\/\//i, 'https://');
  return /([?&])zoom=\d+/.test(https)
    ? https.replace(/([?&])zoom=\d+/, `$1zoom=${zoom}`)
    : `${https}&zoom=${zoom}`;
}

/** Real covers are JPEGs; the placeholder is a small PNG. */
function isGooglePlaceholder({ contentType = '', bytes = 0, sha256 = '' } = {}) {
  if (sha256 && sha256 === GOOGLE_PLACEHOLDER_SHA256) return true;
  if (bytes < 2000) return true;
  return /png/i.test(contentType) && bytes < 20000;
}

async function fetchWithTimeout(fetchImpl, url, options = {}, ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best Google cover for a thumbnail URL: the zoom=0 image when it is a real cover,
 * otherwise the zoom=1 thumbnail (also on any network error).
 */
async function resolveGoogleCover(thumbnail, { fetchImpl = fetch } = {}) {
  if (!isGoogleCoverUrl(thumbnail)) return thumbnail;
  const small = withZoom(thumbnail, 1);
  const big = withZoom(thumbnail, 0);
  try {
    const response = await fetchWithTimeout(fetchImpl, big);
    if (!response.ok) return small;
    const bytes = Buffer.from(await response.arrayBuffer());
    const placeholder = isGooglePlaceholder({
      contentType: response.headers.get('content-type') || '',
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
    return placeholder ? small : big;
  } catch (_) {
    return small;
  }
}

function openLibraryCoverUrl(isbn) {
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`;
}

/** ISBNs of a Google volumeInfo, ISBN-13 first. */
function isbnsFromVolume(volumeInfo) {
  const ids = Array.isArray(volumeInfo?.industryIdentifiers) ? volumeInfo.industryIdentifiers : [];
  return ids
    .filter((id) => /^ISBN_1[03]$/.test(id.type) && id.identifier)
    .sort((a, b) => (a.type === 'ISBN_13' ? -1 : 1) - (b.type === 'ISBN_13' ? -1 : 1))
    .map((id) => String(id.identifier).replace(/[^0-9Xx]/g, ''));
}

/** Open Library cover URL for the first ISBN that has one (404 when missing), or null. */
async function findOpenLibraryCover(isbns, { fetchImpl = fetch } = {}) {
  for (const isbn of isbns) {
    const url = openLibraryCoverUrl(isbn);
    try {
      const response = await fetchWithTimeout(fetchImpl, url, { method: 'HEAD' });
      if (response.ok && /^image\//i.test(response.headers.get('content-type') || '')) return url;
    } catch (_) { /* try the next ISBN */ }
  }
  return null;
}

/** Search Open Library by ISBN, then by title/author: { pages, isbns } (either may be empty). */
async function searchOpenLibrary({ isbns = [], title = '', author = '' }, { fetchImpl = fetch } = {}) {
  const queries = [];
  if (isbns[0]) queries.push({ isbn: isbns[0] });
  if (title) queries.push(author ? { title, author } : { title });
  for (const query of queries) {
    const url = new URL('https://openlibrary.org/search.json');
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    url.searchParams.set('fields', 'number_of_pages_median,isbn');
    url.searchParams.set('limit', '1');
    try {
      const response = await fetchWithTimeout(fetchImpl, url.toString());
      if (!response.ok) continue;
      const doc = (await response.json())?.docs?.[0];
      if (!doc) continue;
      return { pages: doc.number_of_pages_median || 0, isbns: doc.isbn || [] };
    } catch (_) { /* try the next query */ }
  }
  return { pages: 0, isbns: [] };
}

/**
 * Improves book.imagen / book.n_paginas in place: Google zoom=0 when it exists,
 * Open Library when the book has no cover, Open Library page count when missing.
 * An override `imagen` always wins and is never replaced.
 */
async function improveBook(book, { override, placeholder, fetchImpl = fetch } = {}) {
  const opts = { fetchImpl };
  if (!override?.imagen && isGoogleCoverUrl(book.imagen)) {
    book.imagen = await resolveGoogleCover(book.imagen, opts);
  }
  const needsCover = !override?.imagen && (!book.imagen || book.imagen === placeholder);
  const needsPages = !book.n_paginas && !override?.n_paginas;
  if (!needsCover && !needsPages) return book;

  const isbns = isbnsFromVolume(book.volumeInfo);
  if (needsCover && isbns.length) {
    const cover = await findOpenLibraryCover(isbns, opts);
    if (cover) book.imagen = cover;
  }
  const stillNeedsCover = needsCover && (!book.imagen || book.imagen === placeholder);
  if (stillNeedsCover || needsPages) {
    const found = await searchOpenLibrary(
      { isbns, title: book.titulo, author: book.autor && book.autor !== 'Desconocido' ? book.autor : '' },
      opts,
    );
    if (needsPages && found.pages) book.n_paginas = found.pages;
    if (stillNeedsCover && !isbns.length && found.isbns.length) {
      const cover = await findOpenLibraryCover(found.isbns.slice(0, 3), opts);
      if (cover) book.imagen = cover;
    }
  }
  return book;
}

module.exports = {
  GOOGLE_PLACEHOLDER_SHA256,
  findOpenLibraryCover,
  improveBook,
  isGoogleCoverUrl,
  isGooglePlaceholder,
  isbnsFromVolume,
  openLibraryCoverUrl,
  resolveGoogleCover,
  searchOpenLibrary,
  withZoom,
};
