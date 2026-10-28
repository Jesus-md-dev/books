const cachedBooks = require('../../src/data/books.json');
const { fetchSheetRows } = require('../../scripts/googleSheets');
const bookOverrides = require('../../scripts/bookOverrides.json');
const placeholderCover = 'https://i.pinimg.com/736x/e0/e9/78/e0e978256054db86ff9690df51d6cd8d.jpg';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_API_KEY;
const metadataCache = new Map();

const DATA_SHEET_ID = process.env.DATA_SHEET_ID;
const BOOK_SHEET_ID = process.env.GOOGLE_BOOK_SHEET_ID;

function calculateBooks(voteRows, currentTitle) {
  const byTitle = new Map();
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
  for (const title of byTitle.keys()) {
    if (!order.includes(title)) order.push(title);
  }
  const titles = order.filter((title) => title !== currentTitle);
  if (!titles.includes(currentTitle)) titles.push(currentTitle);

  return titles.map((title, id) => {
    const votes = byTitle.get(title) || { votos: [], sum: 0 };
    const saved = cachedBooks.find((book) => book.titulo === title) || {};
    const count = votes.votos.length;
    return {
      ...saved,
      id,
      titulo: title,
      imagen: saved.imagen || placeholderCover,
      autor: saved.autor || 'Desconocido',
      editorial: saved.editorial || 'Desconocida',
      fecha_publicacion: saved.fecha_publicacion || '-',
      descripcion: saved.descripcion || '',
      n_paginas: saved.n_paginas || 0,
      categorias: saved.categorias || [],
      volumeInfo: saved.volumeInfo || [],
      n_votos: count,
      sum_votos: votes.sum,
      media: count ? (votes.sum / count).toFixed(2) : 0,
      votos: votes.votos,
    };
  });
}

function needsMetadata(book) {
  return book.imagen === placeholderCover
    || book.autor === 'Desconocido'
    || !book.descripcion
    || book.editorial === 'Desconocida';
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

async function searchGoogleBooks(title, override) {
  const matchTitle = (override && override.matchTitle) || title;
  const queries = override && override.query
    ? [override.query, `${override.query}.*`, title, `intitle:${title}`]
    : [`${title}.*`, title, `intitle:${title}`];
  let fallback = null;
  for (const query of queries) {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('key', GOOGLE_BOOKS_API_KEY);
    let data;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          data = await response.json();
          break;
        }
        if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
          throw new Error(`Google Books HTTP ${response.status}`);
        }
      } catch (error) {
        if (attempt === 2 || !/fetch failed|Google Books HTTP (429|500|502|503|504)/i.test(error.message)) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    if (!data) continue;
    const items = data.items || [];
    if (items.length && !fallback) {
      fallback = items.sort((a, b) => scoreItem(b) - scoreItem(a))[0];
    }
    const exact = items.filter((item) => item.volumeInfo?.title?.toLowerCase() === matchTitle.toLowerCase());
    const related = items.filter((item) => isTitleRelated(item.volumeInfo?.title || '', matchTitle));
    const matches = exact.length ? exact : related;
    if (matches.length) return matches.sort((a, b) => scoreItem(b) - scoreItem(a))[0];
  }
  return fallback;
}

async function enrichMissingMetadata(books) {
  if (!GOOGLE_BOOKS_API_KEY) return books;

  await Promise.all(books.filter(needsMetadata).map(async (book) => {
    if (!metadataCache.has(book.titulo)) {
      metadataCache.set(book.titulo, searchGoogleBooks(book.titulo, bookOverrides[book.titulo]).catch((error) => {
        console.warn(`[books function] Google Books lookup failed (HTTP/detail omitted): ${error.message}`);
        return null;
      }));
    }
    const item = await metadataCache.get(book.titulo);
    if (!item) return;

    const volume = item.volumeInfo || {};
    if (book.autor === 'Desconocido' && volume.authors?.length) book.autor = volume.authors.join(', ');
    if (book.imagen === placeholderCover && volume.imageLinks?.thumbnail) {
      book.imagen = volume.imageLinks.thumbnail.replace('http://', 'https://');
    }
    if (book.editorial === 'Desconocida' && volume.publisher) book.editorial = volume.publisher;
    if (book.fecha_publicacion === '-' && volume.publishedDate) book.fecha_publicacion = volume.publishedDate;
    if (!book.descripcion && volume.description) book.descripcion = volume.description;
    if (!book.n_paginas && volume.pageCount) book.n_paginas = volume.pageCount;
    if (!book.categorias?.length && volume.categories) book.categorias = volume.categories;
    if (!book.volumeInfo || !Object.keys(book.volumeInfo).length) book.volumeInfo = volume;
    const override = bookOverrides[book.titulo];
    if (override?.imagen) book.imagen = override.imagen;
    if (override?.descripcion) book.descripcion = override.descripcion;
  }));

  books.forEach((book) => {
    const override = bookOverrides[book.titulo];
    if (override?.imagen) book.imagen = override.imagen;
    if (override?.descripcion) book.descripcion = override.descripcion;
  });
  return books;
}

exports.handler = async () => {
  if (!DATA_SHEET_ID || !BOOK_SHEET_ID) {
    return { statusCode: 503, body: 'Google Sheets no está configurado' };
  }

  try {
    const [voteRows, currentRows] = await Promise.all([
      fetchSheetRows(BOOK_SHEET_ID, 'Libros'),
      fetchSheetRows(DATA_SHEET_ID, 'Actual'),
    ]);
    const currentTitle = currentRows[0]?.actual;
    if (!currentTitle) throw new Error('No se encontró el libro actual');
    const latest = await enrichMissingMetadata(calculateBooks(voteRows, currentTitle));
    const changed = JSON.stringify(latest) !== JSON.stringify(cachedBooks);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(changed ? latest : cachedBooks),
    };
  } catch (error) {
    console.error('[books function]', error);
    return { statusCode: 502, body: 'No se pudieron consultar los datos de Google Sheets' };
  }
};
