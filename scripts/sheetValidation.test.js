const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCatalogRows, validateCurrentBookInfo, validateLibrosRows, validateSheetData } = require('./sheetValidation');

function withHeaders(rows, headers) {
  Object.defineProperty(rows, 'sheetHeaders', { value: headers, enumerable: false });
  return rows;
}

test('trims and collapses spaces in vote titles and headers, warning about each', () => {
  const rows = withHeaders([{ '': 'Ana', '  Dune ': 4, 'El  nombre   del viento': '3,5' }], ['  Dune ', 'El  nombre   del viento']);
  const { rows: fixed, warnings } = validateLibrosRows(rows);

  assert.deepEqual(Object.keys(fixed[0]), ['', 'Dune', 'El nombre del viento']);
  assert.deepEqual(fixed.sheetHeaders, ['Dune', 'El nombre del viento']);
  assert.equal(fixed[0].Dune, 4);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /"  Dune " tenía espacios sobrantes/);
});

test('warns about ratings out of range with the sheet row and leaves them in place', () => {
  const rows = [{ '': 'Ana', Dune: 4 }, { '': 'Luis', Dune: '7,5', Emma: -1, Ok: 0.5, Cinco: 5, Vacio: '' }];
  const { rows: fixed, warnings } = validateLibrosRows(rows);

  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /Libros fila 3: voto 7\.5 de Luis en "Dune"/);
  assert.match(warnings[1], /voto -1 de Luis en "Emma"/);
  assert.equal(fixed[1].Dune, '7,5');
});

test('warns about duplicate vote titles ignoring case and spacing', () => {
  const rows = withHeaders([{ '': 'Ana', Dune: 4 }], ['Dune', ' dune ', 'Emma']);
  const { warnings } = validateLibrosRows(rows);

  assert.equal(warnings.filter((w) => /duplicado/.test(w)).length, 1);
  assert.match(warnings.find((w) => /duplicado/.test(w)), /"dune" \(columna 3, ya aparece en columna 2\)/);
});

test('catalog: fixes title spaces and warns about empty or Desconocido authors and duplicates', () => {
  const rows = [
    { Título: ' Dune  ', Autor: 'Frank Herbert' },
    { Título: 'Emma', Autor: '' },
    { Título: 'Ulises', Autor: ' desconocido ' },
    { Título: 'dune', Autor: 'Otro' },
    { Título: '', Autor: '' },
  ];
  const { rows: fixed, warnings } = validateCatalogRows(rows);

  assert.equal(fixed[0]['Título'], 'Dune');
  assert.equal(rows[0]['Título'], ' Dune  ');
  assert.equal(warnings.length, 4);
  assert.match(warnings[0], /Medias fila 2: .*espacios sobrantes/);
  assert.match(warnings[1], /Medias fila 3: "Emma" no tiene autor/);
  assert.match(warnings[2], /Medias fila 4: "Ulises" tiene el autor "desconocido"/);
  assert.match(warnings[3], /Medias fila 5: título duplicado "dune" \(ya aparece en fila 2\)/);
});

test('clean data produces no warnings and tolerates empty input', () => {
  const librosRows = withHeaders([{ '': 'Ana', Dune: 4.5 }], ['Dune']);
  const catalogRows = [{ Título: 'Dune', Autor: 'Frank Herbert' }];

  assert.deepEqual(validateSheetData({ librosRows, catalogRows }).warnings, []);
  assert.deepEqual(validateSheetData().warnings, []);
});

test('warns only about an unrecognizable meeting date, never about absent columns', () => {
  assert.deepEqual(validateCurrentBookInfo({ titulo: 'X', autor: 'Y' }).warnings, []);
  assert.deepEqual(validateCurrentBookInfo({ fecha_reunion: '2026-11-14T18:30', lugar_reunion: 'Café' }).warnings, []);
  const { warnings } = validateCurrentBookInfo({ fecha_reunion: 'pronto' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /"pronto" no tiene un formato reconocible/);
});
