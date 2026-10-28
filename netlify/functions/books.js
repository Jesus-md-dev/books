const crypto = require('node:crypto');
const cachedBooks = require('../../src/data/books.json');
const { fetchSheetRows, getCurrentBook } = require('../../scripts/googleSheets');
const { SHEET_ID } = require('../../scripts/sheetConfig');
const { translateBookMetadata } = require('../../scripts/translateBookMetadata');
const {
  authorMatches,
  catalogTitles,
  createCatalogMap,
  getCatalogAuthor,
  googleBooksQueries,
} = require('../../scripts/bookCatalog');
const bookOverrides = require('../../scripts/bookOverrides.json');
const placeholderCover = 'https://i.pinimg.com/736x/e0/e9/78/e0e978256054db86ff9690df51d6cd8d.jpg';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_API_KEY;
const metadataCache = new Map();
const BLOB_STORE = { name: 'bahia-lectora-data', region: 'eu-central-1', consistency: 'strong' };

async function getBooksStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore(BLOB_STORE);
}

function calculateBooks(voteRows, currentTitle, catalogRows = [], currentAuthor = '', savedBooks = cachedBooks) {
  const byTitle = new Map();
  const catalog = createCatalogMap(catalogRows);
  for (const row of voteRows) {
    const member = row[''];
    for (const [title, rawVote] of Object.entries(row)) {
      if (!title) continue;
      const vote = Number.parseFloat(String(rawVote).replace(',', '.'));
      if (Number.isNaN(vote)) continue;
      if (!byTitle.has(title)) byTitle.set(title, { votos: [], sum: 0 });
      const entry = byTitle.get(title);
      entry.votos.push({ nombre: member, voto: vote });
      entry.sum += vote;
    }
  }

  const order = voteRows.sheetHeaders ? [...voteRows.sheetHeaders] : [...byTitle.keys()];
  const orderedTitles = new Set(order.map((title) => String(title).trim().toLocaleLowerCase()));
  for (const title of catalogTitles(catalogRows)) {
    const normalized = String(title).trim().toLocaleLowerCase();
    if (!orderedTitles.has(normalized)) {
      order.push(title);
      orderedTitles.add(normalized);
    }
  }
  for (const title of byTitle.keys()) {
    const normalized = String(title).trim().toLocaleLowerCase();
    if (!orderedTitles.has(normalized)) {
      order.push(title);
      orderedTitles.add(normalized);
    }
  }
  const titles = order.filter((title) => String(title).trim() !== String(currentTitle).trim());
  if (!titles.some((title) => String(title).trim() === String(currentTitle).trim())) titles.push(currentTitle);

  return titles.map((title, id) => {
    const matchingVoteTitle = [...byTitle.keys()].find((key) => String(key).trim() === String(title).trim());
    const votes = byTitle.get(matchingVoteTitle) || { votos: [], sum: 0 };
    const saved = savedBooks.find((book) => String(book.titulo).trim() === String(title).trim()) || {};
    const count = votes.votos.length;
    return {
      ...saved,
      id,
      titulo: title,
      imagen: saved.imagen || placeholderCover,
      editorial: saved.editorial || 'Desconocida',
      fecha_publicacion: saved.fecha_publicacion || '-',
      descripcion: saved.descripcion || '',
      n_paginas: saved.n_paginas || 0,
      categorias: saved.categorias || [],
      volumeInfo: saved.volumeInfo || [],
      autor: (String(title).trim() === String(currentTitle).trim() && currentAuthor)
        || getCatalogAuthor(title, catalog)
        || saved.autor
        || 'Desconocido',
      n_votos: count,
      sum_votos: votes.sum,
      media: count ? (votes.sum / count).toFixed(2) : 0,
      votos: votes.votos,
    };
  });
}

function needsMetadata(book, refreshForAuthorChange = false) {
  return book.imagen === placeholderCover
    || book.autor === 'Desconocido'
    || !book.descripcion
    || book.editorial === 'Desconocida'
    || refreshForAuthorChange;
}

function isTitleRelated(resultTitle, bookTitle) {
  const result = resultTitle.toLowerCase().trim();
  const book = bookTitle.toLowerCase().trim();
  return result === book || result.includes(book) || book.includes(result);
}

function scoreItem(item) {
  const volume = item.volumeInfo || {};
  return (volume.language === 'es' ? 1000 : 0)
    + (volume.imageLinks ? 100 : 0)
    + (volume.ratingsCount || 0);
}

async function searchGoogleBooks(title, catalogAuthor, override) {
  const matchTitle = (override && override.matchTitle) || title;
  const queries = googleBooksQueries(title, catalogAuthor, override);
  let fallback = null;
  let titleFallback = null;
  for (const query of queries) {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('key', GOOGLE_BOOKS_API_KEY);
    url.searchParams.set('langRestrict', 'es');
    const fetchResults = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(url);
          if (response.ok) return response.json();
          if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
            throw new Error(`Google Books HTTP ${response.status}`);
          }
        } catch (error) {
          if (attempt === 2 || !/fetch failed|Google Books HTTP (429|500|502|503|504)/i.test(error.message)) throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
      return null;
    };
    let data = await fetchResults();
    const queryTargetsAuthor = catalogAuthor
      && (query.toLocaleLowerCase().includes('inauthor:')
        || query.toLocaleLowerCase().includes(catalogAuthor.toLocaleLowerCase()));
    let items = data?.items || [];
    let authorMatchesItems = catalogAuthor
      ? items.filter((item) => authorMatches(catalogAuthor, item.volumeInfo?.authors))
      : items;
    if (!items.length || (queryTargetsAuthor && !authorMatchesItems.length)) {
      url.searchParams.delete('langRestrict');
      data = await fetchResults();
      items = data?.items || [];
      authorMatchesItems = catalogAuthor
        ? items.filter((item) => authorMatches(catalogAuthor, item.volumeInfo?.authors))
        : items;
    }
    if (!data) continue;
    if (items.length && !queryTargetsAuthor && !titleFallback) {
      titleFallback = [...items].sort((a, b) => scoreItem(b) - scoreItem(a))[0];
    }
    if (authorMatchesItems.length && !fallback) {
      fallback = authorMatchesItems.sort((a, b) => scoreItem(b) - scoreItem(a))[0];
    }
    const exact = authorMatchesItems.filter((item) => item.volumeInfo?.title?.toLowerCase() === matchTitle.toLowerCase());
    const related = authorMatchesItems.filter((item) => isTitleRelated(item.volumeInfo?.title || '', matchTitle));
    const matches = exact.length ? exact : related;
    if (matches.length) return matches.sort((a, b) => scoreItem(b) - scoreItem(a))[0];
  }
  return fallback || titleFallback;
}

async function enrichMissingMetadata(books, catalogRows = [], { savedBooks = cachedBooks, forceRefresh = false } = {}) {
  const catalog = createCatalogMap(catalogRows);
  if (GOOGLE_BOOKS_API_KEY) await Promise.all(books.map(async (book) => {
    const saved = savedBooks.find((item) => String(item.titulo).trim() === String(book.titulo).trim());
    const catalogAuthor = getCatalogAuthor(book.titulo, catalog);
    const lookupAuthor = book.autor !== 'Desconocido' ? book.autor : catalogAuthor;
    const authorChanged = Boolean(lookupAuthor && lookupAuthor.trim() !== String(saved?.autor || '').trim());
    const refreshBook = forceRefresh || authorChanged;
    if (!needsMetadata(book, refreshBook)) return;
    const cacheKey = `${book.titulo}\u0000${lookupAuthor}`;
    if (forceRefresh || !metadataCache.has(cacheKey)) {
      metadataCache.set(cacheKey, searchGoogleBooks(book.titulo, lookupAuthor, bookOverrides[book.titulo]).catch((error) => {
        console.warn(`[books function] Google Books lookup failed (HTTP/detail omitted): ${error.message}`);
        return null;
      }));
    }
    const item = await metadataCache.get(cacheKey);
    if (!item) return;

    const volume = item.volumeInfo || {};
    if (book.autor === 'Desconocido' && volume.authors?.length) book.autor = volume.authors.join(', ');
    const verifiedAuthor = !lookupAuthor || authorMatches(lookupAuthor, volume.authors);
    if (!verifiedAuthor) return;

    const thumbnail = volume.imageLinks?.thumbnail || volume.imageLinks?.smallThumbnail;
    if ((forceRefresh || book.imagen === placeholderCover || authorChanged) && thumbnail) {
      book.imagen = thumbnail.replace('http://', 'https://');
    }
    if ((forceRefresh || book.editorial === 'Desconocida') && volume.publisher) book.editorial = volume.publisher;
    if ((forceRefresh || book.fecha_publicacion === '-') && volume.publishedDate) book.fecha_publicacion = volume.publishedDate;
    if ((forceRefresh || !book.descripcion) && volume.description) book.descripcion = volume.description;
    if ((forceRefresh || !book.n_paginas) && volume.pageCount) book.n_paginas = volume.pageCount;
    if ((forceRefresh || !book.categorias?.length) && volume.categories) book.categorias = volume.categories;
    if (forceRefresh || !book.volumeInfo || !Object.keys(book.volumeInfo).length) book.volumeInfo = volume;
    if (forceRefresh) book.traduccion_es = {};
    const override = bookOverrides[book.titulo];
    if (override?.imagen) book.imagen = override.imagen;
    if (override?.descripcion) book.descripcion = override.descripcion;
  }));

  books.forEach((book) => {
    const override = bookOverrides[book.titulo];
    if (override?.imagen) book.imagen = override.imagen;
    if (override?.descripcion) book.descripcion = override.descripcion;
  });

  await Promise.all(books.map(async (book) => {
    const override = bookOverrides[book.titulo];
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
  return books;
}

exports.handler = async (event = {}) => {
  try {
    const store = await getBooksStore();
    const storedState = await store.get('latest', { type: 'json', consistency: 'strong' });
    const savedBooks = Array.isArray(storedState?.books) ? storedState.books : cachedBooks;
    const forceMetadata = event.queryStringParameters?.forceMetadata === '1';
    if (forceMetadata && !GOOGLE_BOOKS_API_KEY) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ error: 'Falta GOOGLE_API_KEY para actualizar todos los datos de Google Books.' }),
      };
    }

    const readCatalogRows = async () => {
      try {
        return await fetchSheetRows(SHEET_ID, 'Medias');
      } catch (error) {
        console.warn(`[books function] No se pudo leer "Medias"; se usará la búsqueda por título: ${error.message}`);
        return [];
      }
    };
    const [voteRows, currentRows, catalogRows] = await Promise.all([
      fetchSheetRows(SHEET_ID, 'Libros'),
      fetchSheetRows(SHEET_ID, 'Actual'),
      readCatalogRows(),
    ]);
    const currentBook = getCurrentBook(currentRows);
    const currentTitle = currentBook?.titulo;
    if (!currentTitle) throw new Error('No se encontró el libro actual');
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify({
      Libros: { headers: voteRows.sheetHeaders || [], rows: voteRows },
      Actual: { headers: currentRows.sheetHeaders || [], rows: currentRows },
      Medias: { headers: catalogRows.sheetHeaders || [], rows: catalogRows },
    })).digest('hex');

    if (!forceMetadata && storedState?.fingerprint === fingerprint && Array.isArray(storedState.books)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(storedState.books),
      };
    }

    const sheetsChanged = !storedState || storedState.fingerprint !== fingerprint;
    const latest = await enrichMissingMetadata(
      calculateBooks(voteRows, currentTitle, catalogRows, currentBook.autor, savedBooks),
      catalogRows,
      { savedBooks, forceRefresh: forceMetadata || sheetsChanged },
    );
    await store.setJSON('latest', { fingerprint, books: latest, updatedAt: new Date().toISOString() });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(latest),
    };
  } catch (error) {
    console.error('[books function]', error);
    return { statusCode: 502, body: 'No se pudieron consultar los datos de Google Sheets' };
  }
};
