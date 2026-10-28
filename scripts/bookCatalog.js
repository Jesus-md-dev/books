function normalizeTitle(title) {
  return String(title || '').trim().toLocaleLowerCase();
}

function normalizeHeader(header) {
  return String(header || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z]/g, '');
}

function getCatalogField(row, names) {
  const acceptedNames = new Set(names);
  const entry = Object.entries(row).find(([header]) => acceptedNames.has(normalizeHeader(header)));
  return entry ? entry[1] : '';
}

function createCatalogMap(catalogRows = []) {
  const catalog = new Map();
  for (const row of catalogRows) {
    const title = String(getCatalogField(row, ['titulo', 'title']) || '');
    if (!title) continue;
    catalog.set(normalizeTitle(title), {
      titulo: title.trim(),
      autor: String(getCatalogField(row, ['autor', 'author']) || '').trim(),
    });
  }
  return catalog;
}

function catalogTitles(catalogRows = []) {
  return [...createCatalogMap(catalogRows).values()].map((book) => book.titulo);
}

function getCatalogAuthor(title, catalog) {
  return catalog.get(normalizeTitle(title))?.autor || '';
}

function authorMatches(catalogAuthor, itemAuthors = []) {
  if (!catalogAuthor || !itemAuthors.length) return false;
  const normalize = (value) => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const catalogAuthors = catalogAuthor.split(/\s*(?:,|;| y )\s*/i).map(normalize);

  return catalogAuthors.some((knownAuthor) => itemAuthors.some((itemAuthor) => {
    const candidate = normalize(itemAuthor);
    return knownAuthor.length > 0
      && knownAuthor.every((word) => candidate.includes(word));
  }));
}

function googleBooksQueries(title, catalogAuthor, override) {
  const queries = [];
  if (catalogAuthor) {
    queries.push(`intitle:${title} inauthor:${catalogAuthor}`);
    queries.push(`${title} ${catalogAuthor}`);
  }
  if (override?.query) queries.push(override.query, `${override.query}.*`);
  queries.push(`${title}.*`, title);
  return [...new Set(queries)];
}

module.exports = {
  authorMatches,
  catalogTitles,
  createCatalogMap,
  getCatalogAuthor,
  googleBooksQueries,
  normalizeTitle,
};
