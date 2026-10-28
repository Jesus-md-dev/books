#!/usr/bin/env node
/**
 * Build-time script: reads votes ("Libros") and the current book ("Actual")
 * from Google Sheets, computes the books grid, enriches it with the Google
 * Books API, and writes the result to src/data/books.json.
 *
 * Runs during `npm run build` / `npm start` (see package.json "pre*" hooks)
 * so no Google API key or live Sheets/Books calls ever reach the browser.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { fetchSheetRows } = require('./googleSheets');

const API_KEY = process.env.GOOGLE_API_KEY;
const DATA_SHEET_ID = process.env.DATA_SHEET_ID;
const BOOK_SHEET_ID = process.env.GOOGLE_BOOK_SHEET_ID;

const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'books.json');
const OVERRIDES_PATH = path.join(__dirname, 'bookOverrides.json');
const placeholderCover = 'https://i.pinimg.com/736x/e0/e9/78/e0e978256054db86ff9690df51d6cd8d.jpg';

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  } catch (e) {
    console.warn('[fetchBooksData] No se pudo leer bookOverrides.json:', e.message);
    return {};
  }
}

function resetBookFields(book) {
  book.autor = 'Desconocido';
  book.imagen = placeholderCover;
  book.editorial = 'Desconocida';
  book.fecha_publicacion = '-';
  book.descripcion = '';
  book.n_paginas = 0;
  book.categorias = [];
  book.volumeInfo = [];
}

function computeBooks(librosRows, actualTitle) {
  const books = {};

  librosRows.forEach((element) => {
    const username = element[''];
    Object.keys(element).forEach((key) => {
      if (key === '' || element[key] === undefined) return;
      const value = parseFloat(String(element[key]).replace(',', '.'));
      if (isNaN(value)) return;
      if (!books[key]) books[key] = { votos: {}, n_votos: 0, sum_votos: 0, titulo: key };
      books[key].votos[username] = value;
      books[key].n_votos += 1;
      books[key].sum_votos += value;
    });
  });

  let id = 0;
  const rawGridBooks = Object.keys(books).map((key) => {
    const votos = Object.entries(books[key].votos);
    return {
      id: id++,
      titulo: books[key].titulo,
      n_votos: books[key].n_votos,
      sum_votos: books[key].sum_votos,
      media: (books[key].sum_votos / books[key].n_votos).toFixed(2),
      votos: votos.map(([nombre, voto]) => ({ nombre, voto })),
      imagen: placeholderCover,
      autor: 'Desconocido',
      editorial: 'Desconocida',
      fecha_publicacion: '-',
      descripcion: '',
      n_paginas: 0,
      categorias: [],
      volumeInfo: [],
    };
  });

  let order = librosRows.sheetHeaders ? [...librosRows.sheetHeaders] : [];
  if (order.length === 0) {
    librosRows.forEach((element) => {
      if (Object.keys(element).length - 1 === rawGridBooks.length) {
        order = Object.keys(element).slice(1);
      }
    });
  }
  rawGridBooks.forEach((book) => {
    if (!order.includes(book.titulo)) order.push(book.titulo);
  });
  order = order.filter((titulo) => titulo !== actualTitle);
  order.push(actualTitle);

  const gridBooks = [];
  id = 0;
  order.forEach((titulo) => {
    let book = rawGridBooks.find((b) => b.titulo === titulo);
    if (!book) {
      book = {
        titulo, n_votos: 0, sum_votos: 0, media: 0, votos: [], imagen: placeholderCover,
        autor: 'Desconocido', editorial: 'Desconocida', fecha_publicacion: '-',
        descripcion: '', n_paginas: 0, categorias: [], volumeInfo: [],
      };
    }
    book.id = id++;
    gridBooks.push(book);
  });

  return gridBooks;
}

function updateBookFromItem(book, item) {
  if (book.autor === 'Desconocido' && item.volumeInfo.authors) book.autor = item.volumeInfo.authors.join(', ');
  if (book.imagen === placeholderCover && item.volumeInfo.imageLinks) book.imagen = item.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
  if (book.editorial === 'Desconocida' && item.volumeInfo.publisher) book.editorial = item.volumeInfo.publisher;
  if (book.fecha_publicacion === '-' && item.volumeInfo.publishedDate) book.fecha_publicacion = item.volumeInfo.publishedDate;
  if (book.descripcion === '' && item.volumeInfo.description) book.descripcion = item.volumeInfo.description;
  if (book.n_paginas === 0 && item.volumeInfo.pageCount) book.n_paginas = item.volumeInfo.pageCount;
  if (book.categorias.length === 0 && item.volumeInfo.categories) book.categorias = item.volumeInfo.categories;
  if (Array.isArray(book.volumeInfo) && item.volumeInfo) book.volumeInfo = item.volumeInfo;
}

async function fetchGoogleBooksData(title, langRestrict) {
  const langParam = langRestrict ? `&langRestrict=${langRestrict}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=10${langParam}&key=${API_KEY}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (![429, 500, 502, 503, 504].includes(res.status) || attempt === 2) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (attempt === 2 || !/fetch failed|HTTP (429|500|502|503|504)/i.test(err.message)) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error('Google Books request failed after retries');
}

async function googleBooksAvailable() {
  if (!API_KEY) return false;
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:9780140328721&maxResults=1&key=${API_KEY}`;
    const response = await fetch(url);
    return response.ok;
  } catch (_) {
    return false;
  }
}

function applyCache(gridBooks, cachedBooks, overrides) {
  const cacheByTitle = new Map(cachedBooks.map((b) => [b.titulo, b]));
  for (const book of gridBooks) {
    const override = overrides[book.titulo];
    if (override && override.skip) continue;
    const cached = cacheByTitle.get(book.titulo);
    if (cached && cached.imagen && cached.imagen !== placeholderCover) {
      book.autor = cached.autor;
      book.imagen = cached.imagen;
      book.editorial = cached.editorial;
      book.fecha_publicacion = cached.fecha_publicacion;
      book.descripcion = cached.descripcion;
      book.n_paginas = cached.n_paginas;
      book.categorias = cached.categorias;
      book.volumeInfo = cached.volumeInfo;
    }
  }
  return gridBooks;
}

function isTitleRelated(a, b) {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.includes(nb) || nb.includes(na);
}

// Scores an item so Spanish editions with a cover win over other editions,
// using ratingsCount only as a tie-breaker among otherwise-equal candidates.
function scoreItem(item) {
  const v = item.volumeInfo;
  let score = 0;
  if (v.language === 'es') score += 1000;
  if (v.imageLinks) score += 100;
  score += v.ratingsCount || 0;
  return score;
}

function pickBest(items) {
  return items.reduce((a, b) => (scoreItem(b) > scoreItem(a) ? b : a));
}

// True if the two author lists plausibly refer to the same person(s). Used to
// safely adopt a Spanish edition with a different (translated) title without
// risking picking an unrelated homonym book — only trusted once the author
// already matches a confirmed edition.
function authorsOverlap(knownAuthor, itemAuthors) {
  if (!knownAuthor || !itemAuthors || itemAuthors.length === 0) return false;
  const normalize = (s) => s.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const knownWords = normalize(knownAuthor);
  return itemAuthors.some((a) => {
    const itemWords = normalize(a);
    // Same person if first and last name both appear, regardless of middle names/order.
    return itemWords.length > 0 && itemWords[0] === knownWords[0]
      && itemWords[itemWords.length - 1] === knownWords[knownWords.length - 1];
  });
}

async function enrichBooks(gridBooks, overrides) {
  const unresolved = [];
  for (const book of gridBooks) {
    const override = overrides[book.titulo];
    if (override && override.skip) continue;
    if (book.imagen !== placeholderCover) continue;
    const baseQuery = (override && override.query) || book.titulo;
    const matchTitle = (override && override.matchTitle) || book.titulo;
    for (const query of [`${baseQuery}.*`, baseQuery]) {
      let data;
      try {
        data = await fetchGoogleBooksData(query);
      } catch (err) {
        console.warn(`  ! Google Books falló para "${query}": ${err.message}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (data && data.items && data.items.length > 0) {
        // Among exact-title matches, prefer the most "known" edition (highest ratingsCount)
        // instead of blindly using whichever the API happened to list last.
        const exactMatches = data.items.filter(
          (item) => item.volumeInfo.title.toLowerCase() === matchTitle.toLowerCase(),
        );
        let matched = false;
        if (exactMatches.length > 0) {
          const best = pickBest(exactMatches);
          updateBookFromItem(book, best);
          matched = true;

          // The exact-title match may be a non-Spanish edition even though a
          // Spanish translation (with a different title) exists. Only adopt
          // its cover once the author matches — never based on title alone.
          if (best.volumeInfo.language !== 'es') {
            const spanishEdition = data.items
              .filter((item) => item.volumeInfo.language === 'es'
                && item.volumeInfo.imageLinks
                && authorsOverlap(book.autor, item.volumeInfo.authors))
              .sort((a, b) => (b.volumeInfo.ratingsCount || 0) - (a.volumeInfo.ratingsCount || 0))[0];
            if (spanishEdition) {
              book.imagen = spanishEdition.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
            }
          }
        }
        if (!matched && (book.autor === 'Desconocido' || book.imagen === placeholderCover)) {
          // No exact title match: prefer a result whose title clearly relates to
          // the book (substring match); if none does, still take the top result
          // rather than leave the entry with no cover/data at all.
          const related = data.items.filter((item) => isTitleRelated(item.volumeInfo.title, matchTitle));
          updateBookFromItem(book, related.length > 0 ? pickBest(related) : data.items[0]);
        }
        if (book.autor !== 'Desconocido' && book.imagen !== placeholderCover) break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    if (book.imagen === placeholderCover) unresolved.push(book.titulo);
  }
  if (unresolved.length > 0) {
    console.warn(`[fetchBooksData] ⚠ ${unresolved.length} libro(s) sin portada automática (revisa si necesitan una entrada en scripts/bookOverrides.json): ${unresolved.join(', ')}`);
  }
  return gridBooks;
}

async function main() {
  if (!DATA_SHEET_ID || !BOOK_SHEET_ID) {
    console.warn('[fetchBooksData] Faltan DATA_SHEET_ID / GOOGLE_BOOK_SHEET_ID.');
    if (!fs.existsSync(OUT_PATH)) {
      fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
      fs.writeFileSync(OUT_PATH, '[]\n');
      console.warn('[fetchBooksData] Creado src/data/books.json vacío como fallback.');
    } else {
      console.warn('[fetchBooksData] Se mantiene src/data/books.json existente.');
    }
    return;
  }

  console.log('[fetchBooksData] Leyendo hoja "Libros"...');
  const librosRows = await fetchSheetRows(BOOK_SHEET_ID, 'Libros');
  console.log(`  -> ${librosRows.length} filas de votos`);

  console.log('[fetchBooksData] Leyendo hoja "Actual"...');
  const actualRows = await fetchSheetRows(DATA_SHEET_ID, 'Actual');
  const actualTitle = actualRows[0] && actualRows[0].actual;
  if (!actualTitle) throw new Error('No se encontró el libro actual en la hoja "Actual"');
  console.log(`  -> Libro actual: ${actualTitle}`);

  let gridBooks = computeBooks(librosRows, actualTitle);
  console.log(`[fetchBooksData] Calculados ${gridBooks.length} libros.`);

  const overrides = loadOverrides();
  const overriddenTitles = Object.keys(overrides);
  if (overriddenTitles.length > 0) {
    console.log(`[fetchBooksData] Aplicando ${overriddenTitles.length} corrección(es) manual(es): ${overriddenTitles.join(', ')}`);
    gridBooks.forEach((book) => {
      const override = overrides[book.titulo];
      if (override && override.skip) resetBookFields(book);
    });
  }

  if (fs.existsSync(OUT_PATH)) {
    try {
      const cachedBooks = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
      gridBooks = applyCache(gridBooks, cachedBooks, overrides);
      console.log('[fetchBooksData] Reutilizados datos de enriquecimiento ya existentes en books.json.');
    } catch (e) {
      console.warn('[fetchBooksData] No se pudo leer la caché existente:', e.message);
    }
  }

  if (await googleBooksAvailable()) {
    console.log('[fetchBooksData] Enriqueciendo libros pendientes con Google Books...');
    gridBooks = await enrichBooks(gridBooks, overrides);
  } else {
    console.log('[fetchBooksData] Google Books no está disponible; se conservan los datos de enriquecimiento disponibles.');
  }

  gridBooks.forEach((book) => {
    const override = overrides[book.titulo];
    if (override && override.imagen) book.imagen = override.imagen;
    if (override && override.descripcion) book.descripcion = override.descripcion;
  });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(gridBooks, null, 2) + '\n');
  console.log(`[fetchBooksData] Escrito ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[fetchBooksData] Error:', err.message);
  process.exit(1);
});
