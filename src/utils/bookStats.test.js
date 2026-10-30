import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAffinities, computeMemberAffinity, computeMostDivisive } from './bookStats.js';

const book = (titulo, votes) => ({ titulo, votos: Object.entries(votes).map(([nombre, voto]) => ({ nombre, voto })) });
const many = (n, f) => Array.from({ length: n }, (_, i) => f(i));

test('affinity is 100 for identical votes and 0 for opposite extremes', () => {
  const same = many(4, (i) => book(`s${i}`, { A: 4, B: 4 }));
  assert.equal(computeAffinities(same)[0].afinidad, 100);
  const opp = many(4, (i) => book(`o${i}`, { A: 0.5, B: 5 }));
  assert.equal(computeAffinities(opp)[0].afinidad, 0);
});

test('pairs below the shared-book threshold are ignored', () => {
  const few = many(3, (i) => book(`f${i}`, { A: 4, B: 4 }));
  assert.equal(computeAffinities(few).length, 0);
  assert.equal(computeAffinities(few, { minShared: 3 }).length, 1);
});

test('out-of-scale votes are ignored', () => {
  const books = many(4, (i) => book(`x${i}`, { A: 4, B: 4, C: -5 }));
  const pairs = computeAffinities(books);
  assert.equal(pairs.length, 1);
  assert.deepEqual([pairs[0].a, pairs[0].b], ['A', 'B']);
});

test('member affinity picks most and least similar', () => {
  const books = many(4, (i) => book(`m${i}`, { A: 4, B: 4, C: 1 }));
  const r = computeMemberAffinity(books);
  assert.equal(r.A.mas.nombre, 'B');
  assert.equal(r.A.menos.nombre, 'C');
  assert.equal(r.C.mas.nombre, r.C.menos.nombre === 'A' ? 'B' : 'A');
});

test('menos is null with a single comparable member', () => {
  const books = many(4, (i) => book(`n${i}`, { A: 4, B: 3 }));
  assert.equal(computeMemberAffinity(books).A.menos, null);
});

test('most divisive book needs a minimum of valid votes', () => {
  const calm = book('calm', { A: 4, B: 4, C: 4, D: 4, E: 4 });
  const split = book('split', { A: 0.5, B: 5, C: 0.5, D: 5, E: 0.5 });
  const tiny = book('tiny', { A: 0.5, B: 5 });
  const r = computeMostDivisive([calm, tiny, split]);
  assert.equal(r.book.titulo, 'split');
  assert.equal(r.nVotos, 5);
  assert.equal(computeMostDivisive([tiny]), null);
});
