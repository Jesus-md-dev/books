/**
 * Pure helpers for the catalogue filters (#29): URL parsing/serializing,
 * filtering and facet counts. No React here so they can be tested with node:test.
 *
 * Logic: OR inside a group, AND between groups and with the text search `q`.
 */

export const PAGE_SIZE = 10;

export const PAGE_RANGES = [
  { id: 'corto', label: 'Corto (< 250 págs.)', short: 'Menos de 250 págs.', test: (n) => n > 0 && n < 250 },
  { id: 'medio', label: 'Medio (250–400)', short: '250–400 págs.', test: (n) => n >= 250 && n <= 400 },
  { id: 'largo', label: 'Largo (> 400)', short: 'Más de 400 págs.', test: (n) => n > 400 },
];

export const RATING_OPTIONS = [
  { id: '4', label: '4 o más', short: 'Nota 4 o más' },
  { id: '3', label: '3 o más', short: 'Nota 3 o más' },
  { id: 'bajo', label: 'Menos de 3', short: 'Nota menos de 3' },
  { id: 'sin', label: 'Sin valorar', short: 'Sin valorar' },
];

/** Sort options: `field` is the DataGrid column, `dir` the default direction. */
export const SORT_OPTIONS = [
  { id: 'titulo', label: 'Título (A–Z)', field: 'titulo', dir: 'asc' },
  { id: 'lectura', label: 'Más recientes', field: 'orden_lectura', dir: 'desc' },
  { id: 'nota', label: 'Mejor nota', field: 'media', dir: 'desc' },
  { id: 'paginas', label: 'Menos páginas', field: 'n_paginas', dir: 'asc' },
  { id: 'autor', label: 'Autor/a (A–Z)', field: 'autor', dir: 'asc' },
];

export const DEFAULT_SORT = 'titulo';

const sortById = (id) => SORT_OPTIONS.find((option) => option.id === id);

/**
 * Sort id equivalent to a DataGrid column.
 * @param {string} field - Column field.
 * @returns {string|null}
 */
export const sortIdForField = (field) => SORT_OPTIONS.find((option) => option.field === field)?.id || null;

function ratingOf(book) {
  if (!(Number(book.n_votos) > 0)) return null;
  const value = parseFloat(book.media);
  return Number.isNaN(value) ? null : value;
}

/**
 * Adds the derived fields used to sort: reading order (array index, so a bigger
 * number is more recent) and numeric rating (null without votes).
 * @param {object[]} books - Books as in books.json.
 * @returns {object[]}
 */
export const withDerivedFields = (books) => books.map((book, index) => ({
  ...book,
  orden_lectura: index,
  nota_num: ratingOf(book),
}));

const cleanCategories = (book) => (Array.isArray(book.categorias) ? book.categorias : [])
  .filter((category) => typeof category === 'string' && category.trim())
  .map((category) => category.trim());

/**
 * Distinct categories sorted by number of books, then alphabetically.
 * @param {object[]} books - Books.
 * @returns {string[]}
 */
export const getCategories = (books) => {
  const counts = new Map();
  books.forEach((book) => new Set(cleanCategories(book)).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
  return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, 'es'));
};

/**
 * Names of the people who voted, sorted by number of votes then alphabetically.
 * @param {object[]} books - Books.
 * @returns {string[]}
 */
export const getVoters = (books) => {
  const counts = new Map();
  books.forEach((book) => (book.votos || []).forEach((vote) => {
    if (vote?.nombre) counts.set(vote.nombre, (counts.get(vote.nombre) || 0) + 1);
  }));
  return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, 'es'));
};

/**
 * Reads the filters from the URL; unknown values are dropped.
 * `dir` is always the effective direction (the default one of the sort if absent).
 * @param {URLSearchParams} searchParams - Current query string.
 * @param {object[]} books - Books (to know the valid categories and voters).
 * @returns {{q: string, cat: string[], pag: string[], nota: string, socio: string, orden: string, dir: string, pagina: number}}
 */
export const parseFilters = (searchParams, books) => {
  const categories = new Set(getCategories(books));
  const voters = new Set(getVoters(books));
  const uniq = (values) => [...new Set(values)];
  const orden = sortById(searchParams.get('orden')) ? searchParams.get('orden') : DEFAULT_SORT;
  const dirParam = searchParams.get('dir');
  const pagina = Number.parseInt(searchParams.get('pagina'), 10);
  const nota = searchParams.get('nota');
  const socio = searchParams.get('socio');
  return {
    q: searchParams.get('q') || '',
    cat: uniq(searchParams.getAll('cat').filter((c) => categories.has(c))),
    pag: uniq(searchParams.getAll('pag').filter((p) => PAGE_RANGES.some((r) => r.id === p))),
    nota: RATING_OPTIONS.some((o) => o.id === nota) ? nota : '',
    socio: voters.has(socio) ? socio : '',
    orden,
    dir: dirParam === 'asc' || dirParam === 'desc' ? dirParam : sortById(orden).dir,
    pagina: Number.isFinite(pagina) && pagina > 1 ? pagina : 1,
  };
};

/**
 * Builds the query string for some filters, omitting default values.
 * @param {object} filters - Filters as returned by parseFilters.
 * @returns {URLSearchParams}
 */
export const serializeFilters = (filters) => {
  const params = new URLSearchParams();
  if (filters.q && filters.q.trim()) params.set('q', filters.q);
  (filters.cat || []).forEach((c) => params.append('cat', c));
  (filters.pag || []).forEach((p) => params.append('pag', p));
  if (filters.nota) params.set('nota', filters.nota);
  if (filters.socio) params.set('socio', filters.socio);
  const orden = filters.orden || DEFAULT_SORT;
  if (orden !== DEFAULT_SORT) params.set('orden', orden);
  if (filters.dir && filters.dir !== sortById(orden)?.dir) params.set('dir', filters.dir);
  if (filters.pagina > 1) params.set('pagina', String(filters.pagina));
  return params;
};

/**
 * Number of active filter groups' selections (search and sort not included).
 * @param {object} filters - Filters.
 * @returns {number}
 */
export const countActiveFilters = (filters) =>
  filters.cat.length + filters.pag.length + (filters.nota ? 1 : 0) + (filters.socio ? 1 : 0);

/**
 * Lowercase text without accents.
 * @param {unknown} value - Any value.
 * @returns {string}
 */
export const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

const matchesText = (book, q) => {
  const tokens = normalizeText(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeText([book.titulo, book.autor, book.editorial, ...cleanCategories(book)].join(' '));
  return tokens.every((token) => haystack.includes(token));
};

const matchesRating = (book, nota) => {
  const rating = ratingOf(book);
  if (nota === 'sin') return rating === null;
  if (rating === null) return false;
  if (nota === '4') return rating >= 4;
  if (nota === '3') return rating >= 3;
  return rating < 3;
};

const MATCHERS = {
  q: (book, filters) => matchesText(book, filters.q),
  cat: (book, filters) => !filters.cat.length || cleanCategories(book).some((c) => filters.cat.includes(c)),
  pag: (book, filters) => {
    if (!filters.pag.length) return true;
    const pages = Number(book.n_paginas);
    return filters.pag.some((id) => PAGE_RANGES.find((r) => r.id === id)?.test(pages));
  },
  nota: (book, filters) => !filters.nota || matchesRating(book, filters.nota),
  socio: (book, filters) => !filters.socio || (book.votos || []).some((v) => v?.nombre === filters.socio),
};

/**
 * Filters books by search and groups. Sorting and paging are not done here.
 * @param {object[]} books - Books.
 * @param {object} filters - Filters.
 * @param {{except?: 'q'|'cat'|'pag'|'nota'|'socio'}} [options] - Group to ignore (for facet counts).
 * @returns {object[]}
 */
export const applyFilters = (books, filters, { except } = {}) =>
  books.filter((book) => Object.entries(MATCHERS).every(([group, matcher]) => group === except || matcher(book, filters)));

/**
 * Number of books each option would give, applying everything except its own group.
 * @param {object[]} books - Books.
 * @param {object} filters - Filters.
 * @returns {{cat: Record<string, number>, pag: Record<string, number>, nota: Record<string, number>, socio: Record<string, number>}}
 */
export const facetCounts = (books, filters) => {
  const counts = { cat: {}, pag: {}, nota: {}, socio: {} };
  getCategories(books).forEach((c) => { counts.cat[c] = 0; });
  PAGE_RANGES.forEach((r) => { counts.pag[r.id] = 0; });
  RATING_OPTIONS.forEach((o) => { counts.nota[o.id] = 0; });
  getVoters(books).forEach((v) => { counts.socio[v] = 0; });

  applyFilters(books, filters, { except: 'cat' }).forEach((book) => {
    new Set(cleanCategories(book)).forEach((c) => { counts.cat[c] += 1; });
  });
  applyFilters(books, filters, { except: 'pag' }).forEach((book) => {
    PAGE_RANGES.forEach((r) => { if (r.test(Number(book.n_paginas))) counts.pag[r.id] += 1; });
  });
  applyFilters(books, filters, { except: 'nota' }).forEach((book) => {
    RATING_OPTIONS.forEach((o) => { if (matchesRating(book, o.id)) counts.nota[o.id] += 1; });
  });
  applyFilters(books, filters, { except: 'socio' }).forEach((book) => {
    new Set((book.votos || []).map((v) => v?.nombre)).forEach((name) => {
      if (name in counts.socio) counts.socio[name] += 1;
    });
  });
  return counts;
};

/**
 * Keeps the page inside 1..last page.
 * @param {number} pagina - 1-based requested page.
 * @param {number} total - Number of rows.
 * @param {number} [pageSize] - Rows per page.
 * @returns {number}
 */
export const clampPage = (pagina, total, pageSize = PAGE_SIZE) =>
  Math.min(Math.max(1, pagina), Math.max(1, Math.ceil(total / pageSize)));
