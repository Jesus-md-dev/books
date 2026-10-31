// Full-size Google covers (zoom=0) weigh ~450 KB: ask Google for a resized copy
// (fife=wN) so pages stay light; other hosts are used as they are. A URL carrying `nofife`
// is used as it is: for some scanned volumes fife returns a different page than the cover.
export const isGoogleCover = (url) => /^https:\/\/books\.google\.[a-z.]+\/books\/content\?/.test(url || '')
  && !/[?&]nofife\b/.test(url);

/** Cover URL resized to `width` px when Google can do it, the same URL otherwise. */
export const resizedCover = (url, width) => (isGoogleCover(url) ? `${url}&fife=w${width}` : url);
