import test from 'node:test';
import assert from 'node:assert/strict';
import { timelineOrder, computeMilestones } from './timeline.js';

const b = (titulo, n_paginas, media, n_votos) => ({ titulo, n_paginas, media, n_votos });

test('timelineOrder puts the most recent first without mutating', () => {
  const books = [b('A'), b('B'), b('C')];
  assert.deepEqual(timelineOrder(books).map((x) => x.titulo), ['C', 'B', 'A']);
  assert.equal(books[0].titulo, 'A');
  assert.deepEqual(timelineOrder(undefined), []);
});

test('milestones sum pages ignoring 0 and pick the longest', () => {
  const m = computeMilestones([b('A', 100, '4', 2), b('B', 0, '3', 1), b('C', 300, '2', 1)]);
  assert.equal(m.totalLibros, 3);
  assert.equal(m.totalPaginas, 400);
  assert.equal(m.masPaginas.titulo, 'C');
});

test('best rated parses string media and skips unvoted books', () => {
  const m = computeMilestones([b('A', 1, '0', 0), b('B', 1, '-2', 3), b('C', 1, '3.5', 2), b('D', 1, '9', 0)]);
  assert.equal(m.mejorValorado.titulo, 'C');
  assert.equal(computeMilestones([b('A', 1, '0', 0)]).mejorValorado, null);
  assert.equal(computeMilestones([b('A', 1, '-2', 3)]).mejorValorado.titulo, 'A');
});

test('empty input gives empty milestones', () => {
  assert.deepEqual(computeMilestones([]), { totalLibros: 0, totalPaginas: 0, mejorValorado: null, masPaginas: null });
});
