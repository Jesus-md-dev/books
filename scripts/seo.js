/** Pure helpers for the postbuild SEO step (sitemap, head block, JSON-LD). */
const SITE_URL = 'https://bahia-lectora.jzmarquez.com';
const SITE_NAME = 'Bahía Lectora';
const DEFAULT_DESCRIPTION = 'Bahía Lectora - club de lectura';
// Public routes of src/App.jsx. /sorteo is a utility page (noindex on the client), so it is left out.
const STATIC_ROUTES = ['/', '/libros', '/estadisticas', '/linea-temporal', '/socios'];

// Title and description of the static routes (kept in step with PAGES in src/component/PageMeta.jsx).
const STATIC_PAGES = {
  '/libros': { title: `Libros · ${SITE_NAME}`, description: 'Todos los libros leídos por el club de lectura Bahía Lectora, con sus valoraciones.' },
  '/estadisticas': { title: `Estadísticas · ${SITE_NAME}`, description: 'Estadísticas del club de lectura Bahía Lectora: libros mejor y peor valorados y más.' },
  '/linea-temporal': { title: `Línea temporal · ${SITE_NAME}`, description: 'Todas las lecturas del club de lectura Bahía Lectora en orden, con sus hitos: libros, páginas y mejor valorado.' },
  '/socios': { title: `Socios · ${SITE_NAME}`, description: 'Las socias y socios del club de lectura Bahía Lectora y sus libros favoritos.' },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(str) {
  return escapeHtml(str).replace(/'/g, '&apos;');
}

function cleanTitle(book) {
  return String(book.titulo || '').trim().replace(/\s+/g, ' ');
}

/** Final URL path of a book page: Netlify 301s any other form to lowercase + trailing slash. */
/** Final URL path of a static route: Netlify 301s /libros to /libros/ because the prerendered page is a folder index. */
function staticPath(route) {
  return route === '/' ? '/' : `${route}/`;
}

function bookPath(book) {
  return `/libro/${encodeURIComponent(cleanTitle(book).toLowerCase())}/`;
}

function bookDescription(book) {
  const title = cleanTitle(book);
  const text = String(book.descripcion || '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
  const author = book.autor && book.autor !== 'Desconocido' ? ` de ${book.autor}` : '';
  return `${title}${author}: ficha y valoraciones del club de lectura ${SITE_NAME}.`;
}

function getIsbn(book) {
  const ids = (book.volumeInfo && book.volumeInfo.industryIdentifiers) || [];
  const found = ids.find((i) => i.type === 'ISBN_13') || ids.find((i) => i.type === 'ISBN_10');
  return found ? found.identifier : null;
}

/** Book JSON-LD, or null when there is not enough data (title + author). */
function buildBookJsonLd(book) {
  const name = cleanTitle(book);
  if (!name || !book.autor || book.autor === 'Desconocido') return null;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name,
    author: { '@type': 'Person', name: book.autor },
    url: SITE_URL + bookPath(book),
  };
  if (book.imagen) data.image = book.imagen;
  if (book.descripcion) data.description = bookDescription(book);
  const pages = Number(book.n_paginas);
  if (pages > 0) data.numberOfPages = pages;
  const isbn = getIsbn(book);
  if (isbn) data.isbn = isbn;
  if (book.editorial) data.publisher = { '@type': 'Organization', name: book.editorial };
  if (book.fecha_publicacion) data.datePublished = book.fecha_publicacion;
  // aggregateRating deliberately omitted: the average is the club's own
  // members' vote, not independent reviews.
  return data;
}

/** Content for the <!-- og:start --> ... <!-- og:end --> block. */
function buildHeadBlock({ title, description, url, image, type, jsonLd }) {
  const lines = [
    '<!-- og:start -->',
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ];
  if (jsonLd) {
    // "<" escaped so a description can never close the script tag.
    lines.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`);
  }
  lines.push('<!-- og:end -->');
  return lines.join('\n    ');
}

function buildSitemap(books, lastmod) {
  const paths = [...STATIC_ROUTES.map(staticPath), ...books.map(bookPath)];
  const seen = new Set();
  const urls = paths.filter((p) => !seen.has(p) && seen.add(p));
  const body = urls
    .map((p) => `  <url><loc>${escapeXml(SITE_URL + p)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

module.exports = {
  SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, STATIC_ROUTES, STATIC_PAGES,
  escapeHtml, cleanTitle, staticPath, bookPath, bookDescription, getIsbn,
  buildBookJsonLd, buildHeadBlock, buildSitemap,
};
