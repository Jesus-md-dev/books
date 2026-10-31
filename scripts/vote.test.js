const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  columnToA1, createJwt, createVoteHandler, findBookColumn, findMember, listMembers,
  normalizeName, parseVote, resetTokenCache,
} = require('./vote');

test('parseVote accepts numbers and comma text in 0.25 steps within -5..5', () => {
  assert.deepEqual(parseVote('4,5'), { ok: true, voto: 4.5 });
  assert.deepEqual(parseVote(4.5), { ok: true, voto: 4.5 });
  assert.deepEqual(parseVote(-5), { ok: true, voto: -5 });
  assert.deepEqual(parseVote(5), { ok: true, voto: 5 });
  assert.deepEqual(parseVote('3.25'), { ok: true, voto: 3.25 });
  assert.equal(parseVote('abc').ok, false);
  assert.equal(parseVote(5.1).ok, false);
  assert.equal(parseVote(-5.1).ok, false);
  assert.equal(parseVote(4.1).ok, false);
  assert.equal(parseVote(Number.NaN).ok, false);
  assert.equal(parseVote(true).ok, false);
});

test('parseVote reads an empty value as "remove my vote"', () => {
  assert.deepEqual(parseVote(''), { ok: true, voto: null });
  assert.deepEqual(parseVote(null), { ok: true, voto: null });
});

test('normalizeName ignores case and spacing but keeps accents', () => {
  assert.equal(normalizeName('  María   José '), 'maría josé');
  assert.equal(normalizeName('María'), normalizeName('María'));
  assert.notEqual(normalizeName('Maria'), normalizeName('María'));
});

test('columnToA1 converts column numbers', () => {
  assert.deepEqual([1, 26, 27, 52, 53, 702].map(columnToA1), ['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ']);
});

const sheet = [
  ['', 'El libro', 'Otro libro'],
  ['Ana', 4, 3.5],
  [],
  ['  luis  ', 2],
  ['Marta'],
];

test('findMember keeps raw row numbers, even after empty rows', () => {
  assert.deepEqual(findMember(sheet, 'ana'), { status: 'ok', row: 2 });
  assert.deepEqual(findMember(sheet, 'Luis'), { status: 'ok', row: 4 });
  assert.deepEqual(findMember(sheet, 'Marta'), { status: 'ok', row: 5 });
  assert.deepEqual(findMember(sheet, 'Pepe'), { status: 'missing' });
  assert.deepEqual(findMember(sheet, ''), { status: 'missing' });
});

test('findMember reports duplicated names', () => {
  assert.deepEqual(findMember([[''], ['Ana'], ['ANA']], 'ana'), { status: 'duplicate' });
});

test('findBookColumn finds, misses and detects duplicates', () => {
  assert.deepEqual(findBookColumn(sheet, ' otro  LIBRO'), { status: 'ok', column: 3 });
  assert.deepEqual(findBookColumn(sheet, 'Nada'), { status: 'missing' });
  assert.deepEqual(findBookColumn([['', 'X', 'x']], 'x'), { status: 'duplicate' });
});

test('listMembers trims and skips empty names', () => {
  assert.deepEqual(listMembers(sheet), ['Ana', 'luis', 'Marta']);
});

test('createJwt signs RS256 claims that verify with the public key', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const jwt = createJwt({ email: 'bot@x.iam', privateKey, now: 1_700_000_000_000 });
  const [header, claims, signature] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(claims, 'base64url')), {
    iss: 'bot@x.iam',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: 1_700_000_000,
    exp: 1_700_003_600,
  });
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url')));
});

// --- handler with a mock fetch ---

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const ORIGIN = 'https://bahia.example';
const baseEnv = {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'bot@x.iam',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
  GOOGLE_BOOK_SHEET_ID: 'SHEET',
  VOTE_ALLOWED_ORIGINS: ORIGIN,
};

const tabs = {
  Libros: [['', 'El libro', 'Otro libro'], ['Ana', 4, 3.5], [], ['Luis', '', 2]],
  Actual: [['Actual', 'Autor'], ['Libro actual', 'Alguien']],
  Candidatos: [['Título', 'Autor'], ['Candidato', 'Otro']],
  Medias: [['Título', 'Autor', 'Media'], ['El libro', 'A', 1], ['Libro nuevo', 'B', 0]],
};

function mockFetch({ overrides = {}, failWith } = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
    }
    if (failWith && init.method !== undefined && init.method !== 'GET') return { ok: false, status: failWith, json: async () => ({}) };
    const match = decodeURIComponent(String(url)).match(/\/values\/'?([A-Za-z]+)'?(?:!A1:ZZ)?\?valueRenderOption=UNFORMATTED_VALUE/);
    if (match) {
      const data = overrides[match[1]] ?? tabs[match[1]];
      return { ok: true, status: 200, json: async () => ({ values: data }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  return { impl, calls, writes: () => calls.filter((c) => c.init.method === 'PUT' || (c.init.method === 'POST' && !c.url.includes('oauth2'))) };
}

function setup(options, env = baseEnv) {
  resetTokenCache();
  const mock = mockFetch(options);
  return { ...mock, handler: createVoteHandler({ fetchImpl: mock.impl, env, now: () => 1_700_000_000_000 }) };
}

const post = (body, extra = {}) => ({
  httpMethod: 'POST',
  headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-nf-client-connection-ip': '1.1.1.1' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
  ...extra,
});
const json = (response) => JSON.parse(response.body);

test('overwrites a vote with a numeric RAW PUT on the right cell', async () => {
  const { handler, writes } = setup();
  const response = await handler(post({ titulo: 'el libro', socio: 'ana', voto: '4,75' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(json(response), { ok: true, titulo: 'el libro', socio: 'ana', voto: 4.75, anterior: 4 });
  const [write] = writes();
  assert.equal(write.init.method, 'PUT');
  assert.equal(decodeURIComponent(write.url), "https://sheets.googleapis.com/v4/spreadsheets/SHEET/values/'Libros'!B2?valueInputOption=RAW");
  assert.deepEqual(JSON.parse(write.init.body), { values: [[4.75]] });
  assert.equal(write.init.headers.Authorization, 'Bearer tok');
});

test('writes in the right row when empty rows precede the member', async () => {
  const { handler, writes } = setup();
  const response = await handler(post({ titulo: 'Otro libro', socio: 'Luis', voto: -2 }));
  assert.equal(json(response).anterior, 2);
  assert.match(decodeURIComponent(writes()[0].url), /'Libros'!C4\?/);
});

test('unknown member returns 404 and writes nothing', async () => {
  const { handler, writes } = setup();
  const response = await handler(post({ titulo: 'El libro', socio: 'Nadie', voto: 3 }));
  assert.equal(response.statusCode, 404);
  assert.match(json(response).error, /socio/);
  assert.equal(writes().length, 0);
});

test('invalid vote and filled honeypot return 400 without any fetch', async () => {
  for (const body of [
    { titulo: 'El libro', socio: 'Ana', voto: 7 },
    { titulo: 'El libro', socio: 'Ana', voto: 'abc' },
    { titulo: 'El libro', socio: 'Ana' },
    { titulo: 'El libro', socio: 'Ana', voto: 3, web: 'http://spam' },
  ]) {
    const { handler, calls } = setup();
    const response = await handler(post(body));
    assert.equal(response.statusCode, 400);
    assert.ok(json(response).error);
    assert.equal(calls.length, 0);
  }
  const { handler, calls } = setup();
  assert.equal((await handler(post('{no json'))).statusCode, 400);
  assert.equal(calls.length, 0);
});

test('missing environment returns 503', async () => {
  const { handler, calls } = setup({}, { ...baseEnv, GOOGLE_BOOK_SHEET_ID: '' });
  const response = await handler(post({ titulo: 'El libro', socio: 'Ana', voto: 3 }));
  assert.equal(response.statusCode, 503);
  assert.equal(calls.length, 0);
});

test('rejects other origins, methods and big bodies', async () => {
  const { handler, calls } = setup();
  const wrongOrigin = post({ titulo: 'El libro', socio: 'Ana', voto: 3 });
  wrongOrigin.headers.origin = 'https://evil.example';
  assert.equal((await handler(wrongOrigin)).statusCode, 403);
  assert.equal((await handler({ httpMethod: 'PUT', headers: {} })).statusCode, 405);
  assert.equal((await handler(post({ titulo: 'x'.repeat(2000), socio: 'Ana', voto: 3 }))).statusCode, 413);
  assert.equal(calls.length, 0);
});

test('rate limits a single IP to 10 votes per minute', async () => {
  const { handler } = setup();
  let last;
  for (let i = 0; i < 11; i += 1) last = await handler(post({ titulo: 'El libro', socio: 'Ana', voto: 3 }));
  assert.equal(last.statusCode, 429);
});

test('GET returns the member list from column A', async () => {
  const { handler } = setup();
  const response = await handler({ httpMethod: 'GET', headers: {} });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(json(response), { socios: ['Ana', 'Luis'] });
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('a Sheets 403 becomes a 502 about edit permission', async () => {
  const { handler } = setup({ failWith: 403 });
  const response = await handler(post({ titulo: 'El libro', socio: 'Ana', voto: 3 }));
  assert.equal(response.statusCode, 502);
  assert.match(json(response).error, /permiso de edición/);
});

test('reuses the access token between requests', async () => {
  const { handler, calls } = setup();
  await handler(post({ titulo: 'El libro', socio: 'Ana', voto: 3 }));
  await handler(post({ titulo: 'El libro', socio: 'Ana', voto: 2 }));
  assert.equal(calls.filter((c) => c.url.startsWith('https://oauth2.googleapis.com/token')).length, 1);
});

test('creates the column for a catalog book that has none', async () => {
  const { handler, writes } = setup();
  const response = await handler(post({ titulo: 'libro nuevo', socio: 'Ana', voto: 3 }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(json(response), { ok: true, titulo: 'Libro nuevo', socio: 'Ana', voto: 3, anterior: null, columnaNueva: true });
  const [write] = writes();
  assert.match(decodeURIComponent(write.url), /values:batchUpdate$/);
  assert.deepEqual(JSON.parse(write.init.body), {
    valueInputOption: 'RAW',
    data: [
      { range: "'Libros'!D1", values: [['Libro nuevo']] },
      { range: "'Libros'!D2", values: [[3]] },
    ],
  });
});

test('unknown book returns 404', async () => {
  const { handler, writes } = setup();
  const response = await handler(post({ titulo: 'No existe', socio: 'Ana', voto: 3 }));
  assert.equal(response.statusCode, 404);
  assert.equal(writes().length, 0);
});

test('deleting a vote clears the cell and returns the previous value', async () => {
  const { handler, writes } = setup();
  const response = await handler({ ...post({ titulo: 'El libro', socio: 'Ana' }), httpMethod: 'DELETE' });
  assert.deepEqual(json(response), { ok: true, titulo: 'El libro', socio: 'Ana', voto: null, anterior: 4 });
  const [write] = writes();
  assert.match(decodeURIComponent(write.url), /'Libros'!B2:clear$/);

  const viaPost = setup();
  const second = await viaPost.handler(post({ titulo: 'El libro', socio: 'Ana', voto: '' }));
  assert.equal(json(second).anterior, 4);
  assert.equal(viaPost.writes().length, 1);
});

test('deleting a missing vote writes nothing', async () => {
  const { handler, writes } = setup();
  const response = await handler(post({ titulo: 'El libro', socio: 'Luis', voto: null }));
  assert.equal(json(response).anterior, null);
  assert.equal(writes().length, 0);
});

test('rejects the current book and the candidates', async () => {
  for (const titulo of ['Libro actual', 'candidato']) {
    const { handler, writes } = setup();
    const response = await handler(post({ titulo, socio: 'Ana', voto: 3 }));
    assert.equal(response.statusCode, 403);
    assert.equal(writes().length, 0);
  }
});

test('duplicated member rows return 409', async () => {
  const { handler } = setup({ overrides: { Libros: [['', 'El libro'], ['Ana'], ['ana']] } });
  assert.equal((await handler(post({ titulo: 'El libro', socio: 'Ana', voto: 3 }))).statusCode, 409);
});
