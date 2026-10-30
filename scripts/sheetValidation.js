/**
 * Build-time checks of the Google Sheet data. Pure functions: they never throw
 * and never fail the build; they return cleaned rows plus Spanish warnings.
 * Row numbers are sheet rows (the header is row 1).
 */
const { normalizeHeader, normalizeTitle } = require('./bookCatalog');

const MIN_RATING = 0;
const MAX_RATING = 5;
const UNKNOWN_AUTHOR = 'Desconocido';

// Trims and collapses runs of whitespace into one space.
function cleanSpaces(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function findDuplicates(entries) {
  const seen = new Map();
  const duplicates = [];
  entries.forEach(({ title, where }) => {
    const key = normalizeTitle(title);
    if (!key) return;
    if (seen.has(key)) duplicates.push({ title, where, first: seen.get(key) });
    else seen.set(key, where);
  });
  return duplicates;
}

// "Libros": one column per book title, one row per reader, '' = reader name.
function validateLibrosRows(rows = []) {
  const warnings = [];
  const headers = rows.sheetHeaders ? [...rows.sheetHeaders] : null;
  const titleKeys = headers || [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) => key !== '');

  titleKeys.forEach((title) => {
    if (String(title) !== cleanSpaces(title)) {
      warnings.push(`Libros: el título "${title}" tenía espacios sobrantes; se ha corregido a "${cleanSpaces(title)}".`);
    }
  });
  findDuplicates(titleKeys.map((title, i) => ({ title: cleanSpaces(title), where: `columna ${i + 2}` })))
    .forEach(({ title, where, first }) => {
      warnings.push(`Libros: título duplicado "${title}" (${where}, ya aparece en ${first}).`);
    });

  const cleaned = rows.map((row, index) => {
    const fixed = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key === '' ? key : cleanSpaces(key);
      if (key !== '' && row[key] !== undefined && String(row[key]).trim() !== '') {
        const value = parseFloat(String(row[key]).replace(',', '.'));
        if (!isNaN(value) && (value < MIN_RATING || value > MAX_RATING)) {
          const reader = cleanSpaces(row['']) || '(sin nombre)';
          warnings.push(`Libros fila ${index + 2}: voto ${value} de ${reader} en "${cleanKey}" fuera de rango (${MIN_RATING}-${MAX_RATING}).`);
        }
      }
      fixed[cleanKey] = row[key];
    });
    return fixed;
  });
  if (headers) {
    Object.defineProperty(cleaned, 'sheetHeaders', { value: headers.map(cleanSpaces), enumerable: false });
  }
  return { rows: cleaned, warnings };
}

// "Medias": book catalog with title and author columns.
function validateCatalogRows(rows = []) {
  const warnings = [];
  const findKey = (row, names) => Object.keys(row).find((header) => names.includes(normalizeHeader(header)));
  const entries = [];

  const cleaned = rows.map((row, index) => {
    const fixed = { ...row };
    const sheetRow = index + 2;
    const titleKey = findKey(row, ['titulo', 'title']);
    const authorKey = findKey(row, ['autor', 'author']);
    const rawTitle = titleKey ? String(row[titleKey] ?? '') : '';
    if (!rawTitle.trim()) return fixed;
    const title = cleanSpaces(rawTitle);
    if (rawTitle !== title) {
      warnings.push(`Medias fila ${sheetRow}: el título "${rawTitle}" tenía espacios sobrantes; se ha corregido a "${title}".`);
      fixed[titleKey] = title;
    }
    entries.push({ title, where: `fila ${sheetRow}` });
    const author = cleanSpaces(authorKey ? row[authorKey] : '');
    if (!author) warnings.push(`Medias fila ${sheetRow}: "${title}" no tiene autor.`);
    else if (normalizeTitle(author) === normalizeTitle(UNKNOWN_AUTHOR)) {
      warnings.push(`Medias fila ${sheetRow}: "${title}" tiene el autor "${author}".`);
    }
    return fixed;
  });

  findDuplicates(entries).forEach(({ title, where, first }) => {
    warnings.push(`Medias ${where}: título duplicado "${title}" (ya aparece en ${first}).`);
  });
  return { rows: cleaned, warnings };
}

function validateSheetData({ librosRows = [], catalogRows = [] } = {}) {
  const libros = validateLibrosRows(librosRows);
  const catalog = validateCatalogRows(catalogRows);
  return {
    librosRows: libros.rows,
    catalogRows: catalog.rows,
    warnings: [...libros.warnings, ...catalog.warnings],
  };
}

module.exports = {
  MAX_RATING,
  MIN_RATING,
  cleanSpaces,
  validateCatalogRows,
  validateLibrosRows,
  validateSheetData,
};
