import test from 'node:test';
import assert from 'node:assert/strict';
import { applyVoteToBooks, reconcileVotes } from './bookVotes.js';

const books = [{ titulo: 'A', votos: [{ nombre: 'Ana', voto: 4 }, { nombre: 'Luis', voto: 3 }], n_votos: 2, sum_votos: 7, media: '3.50' }];

test('applyVoteToBooks replaces a vote and recalculates the average', () => {
  const [book] = applyVoteToBooks(books, 'A', 'Ana', 5);
  assert.equal(book.n_votos, 2);
  assert.equal(book.sum_votos, 8);
  assert.equal(book.media, '4.00');
});

test('applyVoteToBooks adds and removes votes', () => {
  const [added] = applyVoteToBooks(books, 'A', 'Marta', -1);
  assert.equal(added.n_votos, 3);
  assert.equal(added.media, '2.00');
  const [empty] = applyVoteToBooks(applyVoteToBooks(books, 'A', 'Ana', null), 'A', 'Luis', null);
  assert.equal(empty.media, 0);
  assert.equal(empty.n_votos, 0);
});

test('reconcileVotes keeps local votes until a refresh includes them', () => {
  const pending = [{ titulo: 'A', nombre: 'Ana', voto: 5 }];
  const stale = reconcileVotes(books, pending);
  assert.equal(stale.pending.length, 1);
  assert.equal(stale.books[0].votos.find((v) => v.nombre === 'Ana').voto, 5);
  const fresh = reconcileVotes(applyVoteToBooks(books, 'A', 'Ana', 5), pending);
  assert.equal(fresh.pending.length, 0);
});
