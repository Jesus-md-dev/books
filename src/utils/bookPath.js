/**
 * Path of a book's page, same scheme as bookPath in scripts/seo.js (canonical
 * URLs and sitemap): trimmed title, inner spaces collapsed, URI-encoded.
 * @param {string} titulo - Book title.
 * @returns {string}
 */
export const bookPath = (titulo) =>
  `/libro/${encodeURIComponent(String(titulo || '').trim().replace(/\s+/g, ' '))}`;
