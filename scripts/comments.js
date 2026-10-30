const { normalizeHeader, normalizeTitle } = require('./bookCatalog');

const BOOK_HEADERS = ['libro', 'titulo', 'title', 'book'];
const MEMBER_HEADERS = ['socio', 'socia', 'socioa', 'autor', 'autora', 'miembro', 'nombre'];
const COMMENT_HEADERS = ['comentario', 'comentarios', 'resena', 'resenas', 'opinion', 'texto'];

function field(row, names) {
  const entry = Object.entries(row).find(([header]) => names.includes(normalizeHeader(header)));
  return entry ? String(entry[1] ?? '').replace(/\r\n?/g, '\n').trim() : '';
}

// Rows of the "Comentarios" tab -> [{ libro, socio, comentario }]. Rows without
// book or comment are skipped. Header variants are accepted (Socio, Socia, Socio/a,
// Autor/a...). If gviz did not detect the header (all-text tab) the header arrives
// as a data row with empty keys: read the columns by position (libro, socio, comentario).
function parseCommentRows(rows = []) {
  const comments = [];
  for (const row of rows) {
    let libro = field(row, BOOK_HEADERS);
    let socio = field(row, MEMBER_HEADERS);
    let comentario = field(row, COMMENT_HEADERS);
    if (!libro && !socio && !comentario) {
      const values = Object.values(row).map((value) => String(value ?? '').replace(/\r\n?/g, '\n').trim());
      if (values.length < 3) continue;
      [libro, socio, comentario] = values;
      if (BOOK_HEADERS.includes(normalizeHeader(libro))) continue;
    }
    if (!libro || !comentario) continue;
    comments.push({ libro, socio, comentario });
  }
  return comments;
}

// Groups comments by the exact title of the book they belong to, matched by
// normalized title. Returns { comentarios: { [titulo]: [{ socio, comentario }] },
// unmatched: [{ libro, socio }] } (comments whose book is not in `bookTitles`).
function groupComments(comments, bookTitles = []) {
  const titles = new Map();
  for (const titulo of bookTitles) titles.set(normalizeTitle(titulo), titulo);
  const comentarios = {};
  const unmatched = [];
  for (const { libro, socio, comentario } of comments) {
    const titulo = titles.get(normalizeTitle(libro));
    if (!titulo) {
      unmatched.push({ libro, socio });
      continue;
    }
    (comentarios[titulo] ||= []).push({ socio, comentario });
  }
  return { comentarios, unmatched };
}

module.exports = { groupComments, parseCommentRows };
