const POST_URL = /^https:\/\/(www\.)?instagram\.com\/([\w.]+\/)?(p|reel|tv)\/([\w-]+)\/?(\?.*)?$/;

/**
 * Keeps only valid Instagram post URLs, normalized to /<p|reel|tv>/<code>/ (a profile prefix such as /bahia.lectora/ is dropped).
 * @param {unknown} list Raw list from the data file.
 * @returns {string[]}
 */
export function validPostUrls(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const match = item.trim().match(POST_URL);
    if (!match) continue;
    seen.add(`https://www.instagram.com/${match[3]}/${match[4]}/`);
  }
  return [...seen];
}
