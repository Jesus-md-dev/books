import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFilters, clampPage, facetCounts, parseFilters, serializeFilters, withDerivedFields,
} from './bookFilters.js';

const books = withDerivedFields([
  { id: 0, titulo: 'Árbol de Sombras', autor: 'Ana Ruiz', media: '4.25', n_votos: 2, n_paginas: 200, categorias: ['Terror', 'Fantasía'], votos: [{ nombre: 'Amanda', voto: 4 }, { nombre: 'Carla', voto: 4.5 }] },
  { id: 1, titulo: 'Casa Roja', autor: 'Luis Gil', media: '3.00', n_votos: 1, n_paginas: 250, categorias: ['Terror'], votos: [{ nombre: 'Amanda', voto: 3 }] },
  { id: 2, titulo: 'El fabricante de lágrimas', autor: 'Erin Doom', media: '-4.13', n_votos: 16, n_paginas: 401, categorias: ['Romance'], votos: [{ nombre: 'Carla', voto: -4 }] },
  { id: 3, titulo: 'Sin votos', autor: 'Alguien', media: 0, n_votos: 0, n_paginas: 0, categorias: [], votos: [] },
]);
const parse = (query) => parseFilters(new URLSearchParams(query), books);
const ids = (list) => list.map((b) => b.id);

test('withDerivedFields: reading order and numeric rating', () => {
  assert.deepEqual(books.map((b) => b.orden_lectura), [0, 1, 2, 3]);
  assert.deepEqual(books.map((b) => b.nota_num), [4.25, 3, -4.13, null]);
});

test('parseFilters: defaults and valid values', () => {
  assert.deepEqual(parse(''), { q: '', cat: [], pag: [], nota: '', socio: '', orden: 'titulo', dir: 'asc', pagina: 1 });
  const f = parse('q=casa&cat=Terror&cat=Fantas%C3%ADa&pag=corto&nota=4&socio=Amanda&orden=nota&pagina=2');
  assert.deepEqual(f.cat, ['Terror', 'Fantasía']);
  assert.equal(f.orden, 'nota');
  assert.equal(f.dir, 'desc');
  assert.equal(f.pagina, 2);
});

test('parseFilters: drops unknown values', () => {
  const f = parse('nota=xx&cat=NoExiste&cat=Terror&cat=Terror&pag=enorme&socio=Nadie&orden=raro&dir=up&pagina=-3');
  assert.deepEqual(f, { q: '', cat: ['Terror'], pag: [], nota: '', socio: '', orden: 'titulo', dir: 'asc', pagina: 1 });
  assert.equal(parse('pagina=abc').pagina, 1);
});

test('serializeFilters omits defaults and round-trips', () => {
  assert.equal(serializeFilters(parse('')).toString(), '');
  const query = 'q=casa&cat=Terror&cat=Fantas%C3%ADa&pag=corto&nota=4&socio=Amanda&orden=nota&pagina=2';
  assert.equal(serializeFilters(parse(query)).toString(), query);
  assert.equal(serializeFilters(parse('orden=nota&dir=asc')).toString(), 'orden=nota&dir=asc');
  assert.equal(serializeFilters(parse('orden=nota&dir=desc')).toString(), 'orden=nota');
  assert.equal(serializeFilters(parse('orden=titulo&dir=desc')).toString(), 'dir=desc');
});

test('categories: OR inside the group', () => {
  assert.deepEqual(ids(applyFilters(books, parse('cat=Terror'))), [0, 1]);
  assert.deepEqual(ids(applyFilters(books, parse('cat=Fantas%C3%ADa&cat=Romance'))), [0, 2]);
});

test('page ranges: edges and books without pages', () => {
  assert.deepEqual(ids(applyFilters(books, parse('pag=corto'))), [0]);
  assert.deepEqual(ids(applyFilters(books, parse('pag=medio'))), [1]);
  assert.deepEqual(ids(applyFilters(books, parse('pag=largo'))), [2]);
  assert.deepEqual(ids(applyFilters(books, parse('pag=corto&pag=largo'))), [0, 2]);
});

test('ratings: negative counts as low, unrated only in sin', () => {
  assert.deepEqual(ids(applyFilters(books, parse('nota=4'))), [0]);
  assert.deepEqual(ids(applyFilters(books, parse('nota=3'))), [0, 1]);
  assert.deepEqual(ids(applyFilters(books, parse('nota=bajo'))), [2]);
  assert.deepEqual(ids(applyFilters(books, parse('nota=sin'))), [3]);
});

test('socio and AND across groups and search', () => {
  assert.deepEqual(ids(applyFilters(books, parse('socio=Amanda'))), [0, 1]);
  assert.deepEqual(ids(applyFilters(books, parse('socio=Amanda&cat=Terror&nota=3'))), [0, 1]);
  assert.deepEqual(ids(applyFilters(books, parse('socio=Amanda&nota=4'))), [0]);
  assert.deepEqual(ids(applyFilters(books, parse('q=ARBOL'))), [0]);
  assert.deepEqual(ids(applyFilters(books, parse('q=luis&cat=Terror'))), [1]);
  assert.deepEqual(ids(applyFilters(books, parse('q=luis&cat=Romance'))), []);
});

test('applyFilters except ignores one group', () => {
  const f = parse('cat=Romance&nota=4');
  assert.deepEqual(ids(applyFilters(books, f)), []);
  assert.deepEqual(ids(applyFilters(books, f, { except: 'cat' })), [0]);
  assert.deepEqual(ids(applyFilters(books, f, { except: 'nota' })), [2]);
});

test('facetCounts: own group is not applied, the rest is', () => {
  const none = facetCounts(books, parse(''));
  assert.deepEqual(none.cat, { Terror: 2, Fantasía: 1, Romance: 1 });
  assert.deepEqual(none.pag, { corto: 1, medio: 1, largo: 1 });
  assert.deepEqual(none.nota, { 4: 1, 3: 2, bajo: 1, sin: 1 });
  assert.deepEqual(none.socio, { Amanda: 2, Carla: 2 });
  const f = facetCounts(books, parse('cat=Terror&nota=3'));
  assert.deepEqual(f.cat, { Terror: 2, Fantasía: 1, Romance: 0 });
  assert.deepEqual(f.nota, { 4: 1, 3: 2, bajo: 0, sin: 0 });
  assert.deepEqual(f.socio, { Amanda: 2, Carla: 1 });
  assert.deepEqual(facetCounts(books, parse('q=casa')).cat, { Terror: 1, Fantasía: 0, Romance: 0 });
});

test('clampPage', () => {
  assert.equal(clampPage(99, 29), 3);
  assert.equal(clampPage(2, 29), 2);
  assert.equal(clampPage(5, 0), 1);
});
