/**
 * Pure helpers for the reading timeline. The sheet has no reading date: the
 * order of the books array is the reading order (oldest first).
 */

const pagesOf = (book) => {
  const n = Number(book && book.n_paginas);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Books most recent first, without mutating the input. */
export function timelineOrder(books) {
  return [...(books || [])].reverse();
}

/**
 * Club milestones. `media` is a string and may be negative; books with
 * n_votos 0 are not rated. Pages of 0 are ignored.
 * @returns {{totalLibros: number, totalPaginas: number, mejorValorado: object|null, masPaginas: object|null}}
 */
export function computeMilestones(books) {
  const list = books || [];
  let totalPaginas = 0;
  let mejorValorado = null;
  let mejorMedia = -Infinity;
  let masPaginas = null;
  list.forEach((book) => {
    const pages = pagesOf(book);
    totalPaginas += pages;
    if (pages > 0 && (!masPaginas || pages > pagesOf(masPaginas))) masPaginas = book;
    const media = parseFloat(book.media);
    if (book.n_votos > 0 && Number.isFinite(media) && media > mejorMedia) {
      mejorMedia = media;
      mejorValorado = book;
    }
  });
  return { totalLibros: list.length, totalPaginas, mejorValorado, masPaginas };
}
