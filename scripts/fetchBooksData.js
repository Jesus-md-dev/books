#!/usr/bin/env node
/**
 * Build-time script: reads votes ("Libros"), the book list and authors
 * ("Medias"), and the current book ("Actual") from Google Sheets.
 *
 * Runs during `npm run build` / `npm start` (see package.json "pre*" hooks)
 * so no Google API key or live Sheets/Books calls ever reach the browser.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { fetchSheetRows, getCurrentBook } = require('./googleSheets');
const { SHEET_ID } = require('./sheetConfig');
const {
  authorMatches,
  catalogTitles,
  createCatalogMap,
  getCatalogAuthor,
  googleBooksQueries,
} = require('./bookCatalog');
const { translateBookMetadata } = require('./translateBookMetadata');
const { improveBook } = require('./covers');
const { validateSheetData } = require('./sheetValidation');
const { isFallbackSheet, matchRuletaCandidates, parseRuletaRows } = require('./ruleta');

const API_KEY = process.env.GOOGLE_API_KEY;

const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'books.json');
const CANDIDATOS_PATH = path.join(__dirname, '..', 'src', 'data', 'candidatos.json');
const OVERRIDES_PATH =path.join(__dirname, 'bookOverrides.json');
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

function computeBooks(librosRows, actualTitle, catalogRows = [], actualAuthor = '') {
  const books = {};
  const catalog = createCatalogMap(catalogRows);

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
  const orderedTitles = new Set(order.map((title) => String(title).trim().toLocaleLowerCase()));
  catalogTitles(catalogRows).forEach((title) => {
    const normalized = String(title).trim().toLocaleLowerCase();
    if (!orderedTitles.has(normalized)) {
      order.push(title);
      orderedTitles.add(normalized);
    }
  });
  rawGridBooks.forEach((book) => {
    const normalized = String(book.titulo).trim().toLocaleLowerCase();
    if (!orderedTitles.has(normalized)) {
      order.push(book.titulo);
      orderedTitles.add(normalized);
    }
  });
  order = order.filter((titulo) => String(titulo).trim() !== String(actualTitle).trim());
  if (!order.some((titulo) => String(titulo).trim() === String(actualTitle).trim())) order.push(actualTitle);

  const gridBooks = [];
  id = 0;
  order.forEach((titulo) => {
    let book = rawGridBooks.find((b) => String(b.titulo).trim() === String(titulo).trim());
    if (!book) {
      book = {
        titulo, n_votos: 0, sum_votos: 0, media: 0, votos: [], imagen: placeholderCover,
        autor: 'Desconocido', editorial: 'Desconocida', fecha_publicacion: '-',
        descripcion: '', n_paginas: 0, categorias: [], volumeInfo: [],
      };
    }
    const catalogAuthor = getCatalogAuthor(titulo, catalog);
    if (catalogAuthor) book.autor = catalogAuthor;
    if (actualAuthor && String(titulo).trim() === String(actualTitle).trim()) {
      book.autor = actualAuthor;
    }
    book.id = id++;
    gridBooks.push(book);
  });

  return gridBooks;
}

function updateBookFromItem(book, item, refreshMetadata = false) {
  if (book.autor === 'Desconocido' && item.volumeInfo.authors) book.autor = item.volumeInfo.authors.join(', ');
  if ((refreshMetadata || book.imagen === placeholderCover) && item.volumeInfo.imageLinks?.thumbnail) {
    book.imagen = item.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
  }
  if ((refreshMetadata || book.editorial === 'Desconocida') && item.volumeInfo.publisher) book.editorial = item.volumeInfo.publisher;
  if ((refreshMetadata || book.fecha_publicacion === '-') && item.volumeInfo.publishedDate) book.fecha_publicacion = item.volumeInfo.publishedDate;
  if ((refreshMetadata || book.descripcion === '') && item.volumeInfo.description) book.descripcion = item.volumeInfo.description;
  if ((refreshMetadata || book.n_paginas === 0) && item.volumeInfo.pageCount) book.n_paginas = item.volumeInfo.pageCount;
  if ((refreshMetadata || book.categorias.length === 0) && item.volumeInfo.categories) book.categorias = item.volumeInfo.categories;
  if ((refreshMetadata || Array.isArray(book.volumeInfo)) && item.volumeInfo) book.volumeInfo = item.volumeInfo;
}

function applyBookOverride(book, override) {
  if (!override) return;
  if (override.autor) book.autor = override.autor;
  if (override.imagen) book.imagen = override.imagen;
  if (override.editorial) book.editorial = override.editorial;
  if (override.fecha_publicacion) book.fecha_publicacion = override.fecha_publicacion;
  if (override.descripcion) book.descripcion = override.descripcion;
  if (override.n_paginas) book.n_paginas = override.n_paginas;
  if (override.categorias) book.categorias = override.categorias;

  const volume = book.volumeInfo && !Array.isArray(book.volumeInfo) ? book.volumeInfo : {};
  book.volumeInfo = {
    ...volume,
    ...(override.autor ? { authors: [override.autor] } : {}),
    ...(override.editorial ? { publisher: override.editorial } : {}),
    ...(override.fecha_publicacion ? { publishedDate: override.fecha_publicacion } : {}),
    ...(override.descripcion ? { description: override.descripcion } : {}),
    ...(override.n_paginas ? { pageCount: override.n_paginas } : {}),
    ...(override.categorias ? { categories: override.categorias } : {}),
    ...(override.imagen ? {
      imageLinks: { ...volume.imageLinks, thumbnail: override.imagen, smallThumbnail: override.imagen },
    } : {}),
    ...(override.autor || override.descripcion || override.categorias ? { language: 'es' } : {}),
  };
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

async function enrichBooks(gridBooks, overrides, catalogRows = [], { forceAll = false } = {}) {
  const unresolved = [];
  const catalog = createCatalogMap(catalogRows);
  for (const book of gridBooks) {
    const override = overrides[book.titulo];
    if (override && override.skip) continue;
    const refreshMetadata = forceAll || Boolean(override?.refreshMetadata);
    if (book.imagen !== placeholderCover && !refreshMetadata) continue;
    const matchTitle = (override && override.matchTitle) || book.titulo;
    const catalogAuthor = getCatalogAuthor(book.titulo, catalog) || book.autor;
    for (const query of googleBooksQueries(book.titulo, catalogAuthor, override)) {
      let data;
      try {
        data = await fetchGoogleBooksData(query, 'es');
        if (!data?.items?.length) data = await fetchGoogleBooksData(query);
      } catch (err) {
        console.warn(`  ! Google Books falló para "${query}": ${err.message}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (data && data.items && data.items.length > 0) {
        let matchingAuthors = catalogAuthor
          ? data.items.filter((item) => authorMatches(catalogAuthor, item.volumeInfo.authors))
          : data.items;
        const queryTargetsAuthor = catalogAuthor
          && (query.toLocaleLowerCase().includes('inauthor:')
            || query.toLocaleLowerCase().includes(catalogAuthor.toLocaleLowerCase()));
        if (queryTargetsAuthor && matchingAuthors.length === 0 && data.items.some((item) => item.volumeInfo.language === 'es')) {
          try {
            data = await fetchGoogleBooksData(query);
            matchingAuthors = catalogAuthor
              ? (data.items || []).filter((item) => authorMatches(catalogAuthor, item.volumeInfo.authors))
              : (data.items || []);
          } catch (err) {
            console.warn(`  ! Google Books falló para la búsqueda sin restricción "${query}": ${err.message}`);
          }
        }
        if (queryTargetsAuthor && matchingAuthors.length === 0) continue;
        const authorMatchesItems = matchingAuthors.length ? matchingAuthors : data.items;
        // Among exact-title matches, prefer the most "known" edition (highest ratingsCount)
        // instead of blindly using whichever the API happened to list last.
        const exactMatches = authorMatchesItems.filter(
          (item) => item.volumeInfo.title.toLowerCase() === matchTitle.toLowerCase(),
        );
        let matched = false;
        if (exactMatches.length > 0) {
          const best = pickBest(exactMatches);
          updateBookFromItem(book, best, refreshMetadata);
          matched = true;

          // The exact-title match may be a non-Spanish edition even though a
          // Spanish translation (with a different title) exists. Only adopt
          // its cover once the author matches — never based on title alone.
          if (best.volumeInfo.language !== 'es') {
            const spanishEdition = authorMatchesItems
              .filter((item) => item.volumeInfo.language === 'es'
                && item.volumeInfo.imageLinks
                && authorsOverlap(book.autor, item.volumeInfo.authors))
              .sort((a, b) => (b.volumeInfo.ratingsCount || 0) - (a.volumeInfo.ratingsCount || 0))[0];
            if (spanishEdition) {
              book.imagen = spanishEdition.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
            }
          }
        }
        if (!matched && (book.autor === 'Desconocido' || book.imagen === placeholderCover || refreshMetadata)) {
          // No exact title match: prefer a result whose title clearly relates to
          // the book (substring match); if none does, still take the top result
          // rather than leave the entry with no cover/data at all.
          const related = authorMatchesItems.filter((item) => isTitleRelated(item.volumeInfo.title, matchTitle));
          updateBookFromItem(book, related.length > 0 ? pickBest(related) : authorMatchesItems[0], refreshMetadata);
        }
        if (book.autor !== 'Desconocido' && book.imagen !== placeholderCover) break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    await improveBook(book, { override, placeholder: placeholderCover });
    if (book.imagen === placeholderCover) unresolved.push(book.titulo);
  }
  if (unresolved.length > 0) {
    console.warn(`[fetchBooksData] ⚠ ${unresolved.length} libro(s) sin portada automática (revisa si necesitan una entrada en scripts/bookOverrides.json): ${unresolved.join(', ')}`);
  }
  return gridBooks;
}

// Candidates of the "Candidatos" tab -> src/data/candidatos.json. Never fails the build.
async function buildRuleta(knownBooks, overrides, catalogRows, canSearch) {
  let entries = [];
  try {
    console.log('[fetchBooksData] Leyendo hoja "Candidatos"...');
    let rows = await fetchSheetRows(SHEET_ID, 'Candidatos');
    if (isFallbackSheet(rows, catalogRows)) {
      console.warn('[fetchBooksData] La hoja "Candidatos" no existe (Sheets devolvió la primera hoja).');
      rows = [];
    }
    const candidates = parseRuletaRows(rows);
    if (candidates.length === 0) console.warn('[fetchBooksData] La hoja "Candidatos" está vacía; candidatos.json será [].');
    let previous = [];
    try {
      previous = JSON.parse(fs.readFileSync(CANDIDATOS_PATH, 'utf8'));
    } catch (_) { /* first run */ }
    const matched = matchRuletaCandidates(candidates, [...knownBooks, ...previous], placeholderCover);
    entries = matched.entries;
    if (matched.missing.length > 0 && canSearch) {
      const stubs = matched.missing.map((entry) => ({
        titulo: entry.titulo, autor: entry.autor || 'Desconocido', imagen: placeholderCover,
        editorial: 'Desconocida', fecha_publicacion: '-', descripcion: '', n_paginas: 0,
        categorias: [], volumeInfo: [],
      }));
      await enrichBooks(stubs, overrides, catalogRows);
      stubs.forEach((stub, i) => {
        const entry = matched.missing[i];
        if (stub.imagen !== placeholderCover) entry.imagen = stub.imagen;
        if (!entry.autor && stub.autor !== 'Desconocido') entry.autor = stub.autor;
        entry.n_paginas = stub.n_paginas || entry.n_paginas;
      });
    }
    console.log(`  -> ${entries.length} candidatos en la ruleta`);
  } catch (error) {
    console.warn(`[fetchBooksData] No se pudo leer la hoja "Candidatos" (${error.message}); candidatos.json será [].`);
    entries = [];
  }
  fs.writeFileSync(CANDIDATOS_PATH, JSON.stringify(entries, null, 2) + '\n');
  console.log(`[fetchBooksData] Escrito ${CANDIDATOS_PATH}`);
}

async function main() {
  const forceFullRefresh = process.env.INCOMING_HOOK_TITLE === 'Forzar regeneración completa';
  console.log('[fetchBooksData] Leyendo hoja "Libros"...');
  const librosRows = await fetchSheetRows(SHEET_ID, 'Libros');
  console.log(`  -> ${librosRows.length} filas de votos`);

  console.log('[fetchBooksData] Leyendo hoja "Actual"...');
  const actualRows = await fetchSheetRows(SHEET_ID, 'Actual');
  const actualBook = getCurrentBook(actualRows);
  const actualTitle = actualBook?.titulo;
  if (!actualTitle) throw new Error('No se encontró el libro actual en la hoja "Actual"');
  console.log(`  -> Libro actual: ${actualTitle}`);

  let catalogRows = [];
  try {
    console.log('[fetchBooksData] Leyendo títulos y autores de "Medias"...');
    catalogRows = await fetchSheetRows(SHEET_ID, 'Medias');
  } catch (error) {
    console.warn(`[fetchBooksData] No se pudo leer "Medias"; se usará la búsqueda por título: ${error.message}`);
  }

  const validated = validateSheetData({ librosRows, catalogRows });
  validated.warnings.forEach((warning) => console.warn(`[fetchBooksData] ⚠ ${warning}`));
  if (validated.warnings.length > 0) {
    console.warn(`[fetchBooksData] ⚠ ${validated.warnings.length} aviso(s) en los datos de la hoja; revísalos en Google Sheets.`);
  }

  let gridBooks = computeBooks(validated.librosRows, actualTitle, validated.catalogRows, actualBook.autor);
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
      const catalog = createCatalogMap(catalogRows);
      gridBooks.forEach((book) => {
        const catalogAuthor = getCatalogAuthor(book.titulo, catalog);
        if (catalogAuthor) book.autor = catalogAuthor;
        if (actualBook.autor && String(book.titulo).trim() === String(actualTitle).trim()) {
          book.autor = actualBook.autor;
        }
      });
      console.log('[fetchBooksData] Reutilizados datos de enriquecimiento ya existentes en books.json.');
    } catch (e) {
      console.warn('[fetchBooksData] No se pudo leer la caché existente:', e.message);
    }
  }

  const isGoogleBooksAvailable = await googleBooksAvailable();
  if (forceFullRefresh && !isGoogleBooksAvailable) {
    throw new Error('No se puede regenerar todo: GOOGLE_API_KEY falta o Google Books no está disponible.');
  }

  if (isGoogleBooksAvailable) {
    if (forceFullRefresh) {
      gridBooks.forEach((book) => {
        if (overrides[book.titulo]?.skip) return;
        book.imagen = placeholderCover;
        book.editorial = 'Desconocida';
        book.fecha_publicacion = '-';
        book.descripcion = '';
        book.n_paginas = 0;
        book.categorias = [];
        book.volumeInfo = [];
        book.traduccion_es = {};
      });
    }
    console.log('[fetchBooksData] Enriqueciendo libros pendientes con Google Books...');
    gridBooks = await enrichBooks(gridBooks, overrides, catalogRows, { forceAll: forceFullRefresh });
  } else {
    console.log('[fetchBooksData] Google Books no está disponible; se conservan los datos de enriquecimiento disponibles.');
  }

  if (forceFullRefresh) gridBooks.forEach((book) => { book.traduccion_es = {}; });
  gridBooks.forEach((book) => applyBookOverride(book, overrides[book.titulo]));

  await Promise.all(gridBooks.map(async (book) => {
    const override = overrides[book.titulo];
    const volume = book.volumeInfo && !Array.isArray(book.volumeInfo) ? book.volumeInfo : {};
    const previousTranslation = book.traduccion_es;
    const translatedFields = previousTranslation === true
      ? { descripcion: true, categorias: false }
      : { ...(previousTranslation || {}) };
    if (override?.descripcion) translatedFields.descripcion = true;
    const translated = await translateBookMetadata({
      description: translatedFields.descripcion ? '' : book.descripcion,
      categories: translatedFields.categorias ? [] : book.categorias,
      language: volume.language,
    });
    if (!translatedFields.descripcion && translated.descriptionComplete) {
      translatedFields.descripcion = true;
      if (translated.changed) book.descripcion = translated.description;
    }
    if (!translatedFields.categorias) {
      if (translated.changed) book.categorias = translated.categories;
      if (translated.categoriesComplete) translatedFields.categorias = true;
    }
    book.traduccion_es = translatedFields.descripcion && translatedFields.categorias
      ? true
      : translatedFields;
  }));

  gridBooks.forEach((book) => applyBookOverride(book, overrides[book.titulo]));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(gridBooks, null, 2) + '\n');
  console.log(`[fetchBooksData] Escrito ${OUT_PATH}`);

  await buildRuleta(gridBooks, overrides, catalogRows, isGoogleBooksAvailable);
}

main().catch((err) => {
  console.error('[fetchBooksData] Error:', err.message);
  process.exit(1);
});
