const { normalizeTitle } = require('./bookCatalog');

function normalizeHeader(header) {
  return String(header || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z]/g, '');
}

function field(row, names) {
  const entry = Object.entries(row).find(([header]) => names.includes(normalizeHeader(header)));
  return entry ? String(entry[1] ?? '').trim() : '';
}

// Fallback for a tab with a single free-text column such as
// "3. Salvo mi corazon, todo esta bien - Hector Abad". Returns { titulo, autor }.
function parseFreeText(row) {
  const raw = String(Object.values(row).find((value) => String(value ?? '').trim()) ?? '');
  const text = raw
    .replace(/[​⁠﻿️]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .trim();
  const match = text.match(/^(.*?)\s*-\s+([^-]+)$/);
  return match
    ? { titulo: match[1].trim(), autor: match[2].trim() }
    : { titulo: text, autor: '' };
}

// Rows of the "Candidatos" tab -> [{ titulo, autor }]. Rows without title and
// repeated titles are skipped.
function parseRuletaRows(rows = []) {
  const seen = new Set();
  const candidates = [];
  for (const row of rows) {
    let titulo = field(row, ['titulo', 'title']);
    let autor = field(row, ['autor', 'author']);
    if (!titulo && !autor) {
      // gviz does not detect the header of all-text tabs: it arrives as the first
      // data row with empty/columnN keys, so read the columns by position.
      const values = Object.values(row).map((value) => String(value ?? '').trim());
      if (values.length > 1) [titulo, autor] = values;
      else ({ titulo, autor } = parseFreeText(row));
      if (['titulo', 'title'].includes(normalizeHeader(titulo))) continue;
    }
    if (!titulo) continue;
    const key = normalizeTitle(titulo);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ titulo, autor });
  }
  return candidates;
}

// Reuses data of already known books (books.json, catalog, previous ruleta.json)
// matched by title. `missing` are the entries that still need a lookup.
function matchRuletaCandidates(candidates, knownBooks = [], placeholderCover = '') {
  const known = new Map();
  for (const book of knownBooks) {
    const key = normalizeTitle(book.titulo);
    const current = known.get(key);
    if (!current || (!current.imagen && book.imagen)) known.set(key, book);
  }
  const missing = [];
  const entries = candidates.map((candidate, id) => {
    const entry = { id, titulo: candidate.titulo, autor: candidate.autor || '', imagen: '', n_paginas: 0 };
    const book = known.get(normalizeTitle(candidate.titulo));
    if (book) {
      if (!entry.autor && book.autor && book.autor !== 'Desconocido') entry.autor = book.autor;
      if (book.imagen && book.imagen !== placeholderCover) entry.imagen = book.imagen;
      entry.n_paginas = book.n_paginas || 0;
    }
    if (!entry.imagen) missing.push(entry);
    return entry;
  });
  return { entries, missing };
}

// Copies the useful fields of a Google Books item into an entry without cover.
function applyItemToEntry(entry, item) {
  const volume = item?.volumeInfo || {};
  const thumbnail = volume.imageLinks?.thumbnail || volume.imageLinks?.smallThumbnail;
  if (!entry.imagen && thumbnail) entry.imagen = thumbnail.replace('http://', 'https://');
  if (!entry.autor && volume.authors?.length) entry.autor = volume.authors.join(', ');
  if (!entry.n_paginas && volume.pageCount) entry.n_paginas = volume.pageCount;
}

// The public gviz endpoint answers a missing tab with the first sheet ("Medias").
// Rows identical to it mean the tab does not exist.
function isFallbackSheet(rows = [], firstSheetRows = []) {
  return rows.length > 0 && JSON.stringify(rows) === JSON.stringify(firstSheetRows);
}

module.exports = { isFallbackSheet, applyItemToEntry, matchRuletaCandidates, parseRuletaRows };
