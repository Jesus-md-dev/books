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

function calculateBooks(voteRows, currentTitle, catalogRows = [], currentAuthor = '') {
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
    const saved = cachedBooks.find((book) => String(book.titulo).trim() === String(title).trim()) || {};
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

async function enrichMissingMetadata(books, catalogRows = []) {
  const catalog = createCatalogMap(catalogRows);
  if (GOOGLE_BOOKS_API_KEY) await Promise.all(books.map(async (book) => {
    const saved = cachedBooks.find((item) => String(item.titulo).trim() === String(book.titulo).trim());
    const catalogAuthor = getCatalogAuthor(book.titulo, catalog);
    const lookupAuthor = book.autor !== 'Desconocido' ? book.autor : catalogAuthor;
    const authorChanged = Boolean(lookupAuthor && lookupAuthor.trim() !== String(saved?.autor || '').trim());
    const refreshBook = authorChanged || Boolean(bookOverrides[book.titulo]?.refreshMetadata);
    if (!needsMetadata(book, refreshBook)) return;
    const cacheKey = `${book.titulo}\u0000${lookupAuthor}`;
    if (!metadataCache.has(cacheKey)) {
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
    if ((book.imagen === placeholderCover || refreshBook) && thumbnail) {
      book.imagen = thumbnail.replace('http://', 'https://');
    }
    if ((refreshBook || book.editorial === 'Desconocida') && volume.publisher) book.editorial = volume.publisher;
    if ((refreshBook || book.fecha_publicacion === '-') && volume.publishedDate) book.fecha_publicacion = volume.publishedDate;
    if ((refreshBook || !book.descripcion) && volume.description) book.descripcion = volume.description;
    if ((refreshBook || !book.n_paginas) && volume.pageCount) book.n_paginas = volume.pageCount;
    if ((refreshBook || !book.categorias?.length) && volume.categories) book.categorias = volume.categories;
    if (refreshBook || !book.volumeInfo || !Object.keys(book.volumeInfo).length) book.volumeInfo = volume;
    if (refreshBook) book.traduccion_es = {};
    const override = bookOverrides[book.titulo];
    if (override?.imagen) book.imagen = override.imagen;
    if (override?.descripcion) book.descripcion = override.descripcion;
  }));

  books.forEach((book) => applyBookOverride(book, bookOverrides[book.titulo]));

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
  books.forEach((book) => applyBookOverride(book, bookOverrides[book.titulo]));
  return books;
}

exports.handler = async () => {
  try {
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
    const latest = await enrichMissingMetadata(
      calculateBooks(voteRows, currentTitle, catalogRows, currentBook.autor),
      catalogRows,
    );
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(latest),
    };
  } catch (error) {
    console.error('[books function]', error);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: error.message || 'No se pudieron consultar las hojas de Google Sheets.' }),
    };
  }
};
