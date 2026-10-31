/**
 * Path of a book's page, same scheme as bookPath in scripts/seo.js (canonical
 * URLs and sitemap): trimmed lowercase title, inner spaces collapsed, URI-encoded, trailing slash
 * (the form Netlify serves without a 301).
 * @param {string} titulo - Book title.
 * @returns {string}
 */
export const bookPath = (titulo) =>
  `/libro/${encodeURIComponent(String(titulo || '').trim().replace(/\s+/g, ' ').toLowerCase())}/`;
