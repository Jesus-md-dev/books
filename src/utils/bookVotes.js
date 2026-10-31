/**
 * Pure helpers to show a vote right after it is sent, before the sheet-backed
 * data refreshes. Rounding matches calculateBooks in netlify/functions/books.js.
 */

const sameTitle = (a, b) => String(a).trim() === String(b).trim();

/** Sets (voto number) or removes (voto null) a member's vote and recalculates the totals. */
export function withVote(book, nombre, voto) {
  const votos = (book.votos || []).filter((item) => item.nombre !== nombre);
  if (voto !== null) votos.push({ nombre, voto });
  const sum = votos.reduce((total, item) => total + Number.parseFloat(String(item.voto).replace(',', '.')), 0);
  return {
    ...book,
    votos,
    n_votos: votos.length,
    sum_votos: sum,
    media: votos.length ? (sum / votos.length).toFixed(2) : 0,
  };
}

export function applyVoteToBooks(books, titulo, nombre, voto) {
  return books.map((book) => (sameTitle(book.titulo, titulo) ? withVote(book, nombre, voto) : book));
}

/** True when the refreshed data already holds the pending vote. */
export function includesVote(books, { titulo, nombre, voto }) {
  const book = books.find((item) => sameTitle(item.titulo, titulo));
  const found = book?.votos?.find((item) => item.nombre === nombre);
  if (voto === null) return !found;
  return Boolean(found) && Number.parseFloat(String(found.voto).replace(',', '.')) === voto;
}

/** Reapplies the votes the refreshed data does not include yet; returns the books and what is still pending. */
export function reconcileVotes(books, pending) {
  const stillPending = pending.filter((vote) => !includesVote(books, vote));
  const merged = stillPending.reduce((result, vote) => applyVoteToBooks(result, vote.titulo, vote.nombre, vote.voto), books);
  return { books: merged, pending: stillPending };
}
