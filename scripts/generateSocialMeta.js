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
 * Also writes per-book canonical, description and Book JSON-LD, and build/sitemap.xml.
 */
const fs = require('fs');
const path = require('path');

const seo = require('./seo');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const BOOKS_PATH = path.join(__dirname, '..', 'src', 'data', 'books.json');
const BLOCK_RE = /<!-- og:start -->[\s\S]*?<!-- og:end -->/;

function bookBlock(book) {
  return seo.buildHeadBlock({
    title: `${seo.cleanTitle(book)} · ${seo.SITE_NAME}`,
    description: seo.bookDescription(book),
    url: seo.SITE_URL + seo.bookPath(book),
    image: book.imagen || `${seo.SITE_URL}/logo.webp`,
    type: 'book',
    jsonLd: seo.buildBookJsonLd(book),
  });
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
    const bookTitle = seo.cleanTitle(book);
    if (!bookTitle) continue;
    const html = baseHtml.replace(BLOCK_RE, () => bookBlock(book))
      .replace(/<title>[^<]*<\/title>/, () => `<title>${seo.escapeHtml(bookTitle)} · ${seo.SITE_NAME}</title>`);

    const dir = path.join(BUILD_DIR, 'libro', encodeURIComponent(bookTitle));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    written += 1;
  }

  fs.writeFileSync(path.join(BUILD_DIR, 'sitemap.xml'), seo.buildSitemap(books, new Date().toISOString().slice(0, 10)));
  console.log(`[generateSocialMeta] Generadas ${written} páginas con meta tags por libro.`);
}

main();
