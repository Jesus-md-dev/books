#!/usr/bin/env node
/**
 * Post-build step: writes a physical build/libro/<titulo>/index.html per
 * book, identical to the SPA shell but with per-book Open Graph tags, so
 * sharing a /libro/:titulo link on WhatsApp/Instagram shows that book's
 * real title and cover instead of the site-wide default.
 *
 * Works because Netlify (and static hosts in general) serve an existing
 * file at the exact request path before falling back to the SPA redirect
 * in _redirects — crawlers get the right preview, users get the same JS
 * bundle and React Router takes over normally once it loads.
 */
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://bahia-lectora.jzmarquez.com';
const BUILD_DIR = path.join(__dirname, '..', 'build');
const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const BOOKS_PATH = path.join(__dirname, '..', 'src', 'data', 'books.json');

function buildOgBlock(book) {
  const bookTitle = String(book.titulo || '').trim();
  const title = `${bookTitle} · Bahía Lectora`;
  const description = book.descripcion
    ? book.descripcion.slice(0, 200)
    : `${bookTitle}${book.autor && book.autor !== 'Desconocido' ? ` — ${book.autor}` : ''}`;
  const url = `${SITE_URL}/libro/${encodeURIComponent(bookTitle)}`;

  return `<!-- og:start -->
    <meta property="og:type" content="book" />
    <meta property="og:site_name" content="Bahía Lectora" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(book.imagen)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <!-- og:end -->`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.warn('[generateSocialMeta] build/index.html no existe, ¿has ejecutado `vite build` antes?');
    return;
  }
  if (!fs.existsSync(BOOKS_PATH)) {
    console.warn('[generateSocialMeta] src/data/books.json no existe, nada que generar.');
    return;
  }

  const baseHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const books = JSON.parse(fs.readFileSync(BOOKS_PATH, 'utf8'));

  let written = 0;
  for (const book of books) {
    const bookTitle = String(book.titulo || '').trim();
    const ogBlock = buildOgBlock(book);
    const html = baseHtml.replace(/<!-- og:start -->[\s\S]*?<!-- og:end -->/, ogBlock)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(bookTitle)} · Bahía Lectora</title>`);

    const dir = path.join(BUILD_DIR, 'libro', encodeURIComponent(bookTitle));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    written += 1;
  }

  console.log(`[generateSocialMeta] Generadas ${written} páginas con meta tags por libro.`);
}

main();
