const POST_URL = /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+\/?(\?.*)?$/;

/**
 * Keeps only valid Instagram post URLs, normalized to the canonical form with a trailing slash.
 * @param {unknown} list Raw list from the data file.
 * @returns {string[]}
 */
export function validPostUrls(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const url = item.trim();
    if (!POST_URL.test(url)) continue;
    const { pathname } = new URL(url);
    seen.add(`https://www.instagram.com${pathname.endsWith('/') ? pathname : `${pathname}/`}`);
  }
  return [...seen];
}
