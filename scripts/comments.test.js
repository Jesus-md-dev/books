const test = require('node:test');
const assert = require('node:assert/strict');
const { groupComments, parseCommentRows } = require('./comments');

test('parses Comentarios rows with header variants, skipping incomplete rows', () => {
  const rows = [
    { Libro: 'Dune', 'Socio/a': ' Ana ', Comentario: 'Genial\r\nlo recomiendo' },
    { libro: 'Emma', Socia: 'Luis', comentarios: 'Lento' },
    { Libro: 'Emma', 'Autor/a': 'Eva', Comentario: 'Bonito' },
    { Libro: 'Emma', Socio: 'Sin texto', Comentario: '' },
    { Libro: '', Socio: 'Sin libro', Comentario: 'Hola' },
  ];
  assert.deepEqual(parseCommentRows(rows), [
    { libro: 'Dune', socio: 'Ana', comentario: 'Genial\nlo recomiendo' },
    { libro: 'Emma', socio: 'Luis', comentario: 'Lento' },
    { libro: 'Emma', socio: 'Eva', comentario: 'Bonito' },
  ]);
});

test('reads columns by position when the header was not detected', () => {
  const rows = [
    { '': 'Libro', c1: 'Socio/a', c2: 'Comentario' },
    { '': 'Dune', c1: 'Ana', c2: 'Genial' },
  ];
  assert.deepEqual(parseCommentRows(rows), [{ libro: 'Dune', socio: 'Ana', comentario: 'Genial' }]);
});

test('empty or missing tab gives no comments', () => {
  assert.deepEqual(parseCommentRows([]), []);
  assert.deepEqual(parseCommentRows(undefined), []);
});

test('groups by normalized title and reports comments of unknown books', () => {
  const comments = [
    { libro: ' dune ', socio: 'Ana', comentario: 'Genial' },
    { libro: 'Nada', socio: 'Luis', comentario: 'x' },
    { libro: 'DUNE', socio: 'Eva', comentario: 'Largo' },
  ];
  const { comentarios, unmatched } = groupComments(comments, ['Dune', 'Emma']);
  assert.deepEqual(comentarios, {
    Dune: [{ socio: 'Ana', comentario: 'Genial' }, { socio: 'Eva', comentario: 'Largo' }],
  });
  assert.deepEqual(unmatched, [{ libro: 'Nada', socio: 'Luis' }]);
});
