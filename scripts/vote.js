/**
 * Voting from the web. The "Libros" tab has one row per member (column A, header
 * cell A1 empty) and one column per book (row 1 = title); a vote is the number in
 * their crossing. Writes go through a Google service account (JWT, no extra
 * dependencies) and only ever touch GOOGLE_BOOK_SHEET_ID.
 * Pure functions plus a handler factory that receives fetch, so it runs on mocks.
 */
const crypto = require('node:crypto');
const { createCatalogMap } = require('./bookCatalog');
const { getCurrentBook } = require('./googleSheets');
const { parseRuletaRows } = require('./ruleta');

const SHEETS_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TAB = 'Libros';
const MAX_BODY_BYTES = 1024;
const MAX_VOTES_PER_MINUTE = 10;
const MIN_VOTE = -5;
const MAX_VOTE = 5;

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function normalizeName(value) {
  return String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
}

/** 1 -> A, 26 -> Z, 27 -> AA. */
function columnToA1(column) {
  let n = column;
  let letters = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/**
 * Accepts a number or text like "4,5" in [-5, 5] with steps of 0.25.
 * null or "" mean "remove my vote". Returns { ok, voto } (voto null = remove) or { ok:false, error }.
 */
function parseVote(raw) {
  if (raw === null || (typeof raw === 'string' && raw.trim() === '')) return { ok: true, voto: null };
  let value;
  if (typeof raw === 'number') value = raw;
  else if (typeof raw === 'string' && /^-?\d+([.,]\d+)?$/.test(raw.trim())) value = Number(raw.trim().replace(',', '.'));
  else return { ok: false, error: 'La nota no es un número válido.' };
  if (!Number.isFinite(value)) return { ok: false, error: 'La nota no es un número válido.' };
  if (value < MIN_VOTE || value > MAX_VOTE) return { ok: false, error: `La nota debe estar entre ${MIN_VOTE} y ${MAX_VOTE}.` };
  if (!Number.isInteger(value * 4)) return { ok: false, error: 'La nota debe ir en pasos de 0,25.' };
  return { ok: true, voto: value === 0 ? 0 : value };
}

/** Members from column A, from row 2, in sheet order. */
function listMembers(rows = []) {
  return rows.slice(1).map((row) => String(row?.[0] ?? '').trim()).filter(Boolean);
}

/** Finds the member row. `row` is the 1-based sheet row; raw indexes are kept (empty rows count). */
function findMember(rows = [], socio) {
  const wanted = normalizeName(socio);
  const matches = [];
  if (wanted) rows.forEach((row, index) => {
    if (index > 0 && normalizeName(row?.[0]) === wanted) matches.push(index + 1);
  });
  if (matches.length > 1) return { status: 'duplicate' };
  return matches.length ? { status: 'ok', row: matches[0] } : { status: 'missing' };
}

/** Finds the book column in row 1 (from column B). `column` is 1-based. */
function findBookColumn(rows = [], titulo) {
  const wanted = normalizeName(titulo);
  const matches = [];
  const header = rows[0] || [];
  if (wanted) header.forEach((cell, index) => {
    if (index > 0 && normalizeName(cell) === wanted) matches.push(index + 1);
  });
  if (matches.length > 1) return { status: 'duplicate' };
  return matches.length ? { status: 'ok', column: matches[0] } : { status: 'missing' };
}

function cellVote(rows, row, column) {
  const cell = rows[row - 1]?.[column - 1];
  if (cell === undefined || cell === null || cell === '') return null;
  const value = typeof cell === 'number' ? cell : Number.parseFloat(String(cell).replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

// --- Service account auth -------------------------------------------------

const base64url = (input) => Buffer.from(input).toString('base64url');

function createJwt({ email, privateKey, now = Date.now() }) {
  const iat = Math.floor(now / 1000);
  const claims = { iss: email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 };
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(privateKey);
  return `${unsigned}.${base64url(signature)}`;
}

class SheetsError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let cachedToken = null;

function resetTokenCache() {
  cachedToken = null;
}

async function getAccessToken(env, fetchImpl, now = Date.now()) {
  if (cachedToken && cachedToken.email === env.email && cachedToken.expires - 60_000 > now) return cachedToken.token;
  const assertion = createJwt({ email: env.email, privateKey: env.privateKey, now });
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
  });
  if (!response.ok) throw new SheetsError(response.status, 'Google no ha aceptado la cuenta de servicio.');
  const data = await response.json();
  cachedToken = { email: env.email, token: data.access_token, expires: now + (Number(data.expires_in) || 3600) * 1000 };
  return cachedToken.token;
}

// --- Handler -------------------------------------------------------------

function readEnv(env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = env.GOOGLE_BOOK_SHEET_ID;
  if (!email || !rawKey || !sheetId) return null;
  return { email, privateKey: rawKey.replace(/\\n/g, '\n'), sheetId };
}

function allowedOrigins(env) {
  const list = env.VOTE_ALLOWED_ORIGINS
    ? env.VOTE_ALLOWED_ORIGINS.split(',')
    : [env.URL, env.DEPLOY_PRIME_URL];
  return list.map((origin) => String(origin || '').trim().replace(/\/$/, '')).filter(Boolean);
}

/** Array of rows -> records keyed by header, like fetchSheetRows does for "Actual" and "Medias". */
function rowsToRecords(values = []) {
  const headers = (values[0] || []).map((header, index) => String(header ?? '').trim()
    || (index === 0 ? 'actual' : index === 1 ? 'autor' : `column${index}`));
  return values.slice(1).filter((row) => row?.length).map((row) =>
    row.reduce((record, value, index) => {
      record[headers[index] ?? `column${index}`] = value;
      return record;
    }, {}));
}

function createVoteHandler({ fetchImpl = fetch, env = process.env, now = () => Date.now() } = {}) {
  const hits = new Map(); // ip -> timestamps; best effort, a cold Lambda starts empty

  const reply = (statusCode, payload) => ({ statusCode, headers: HEADERS, body: JSON.stringify(payload) });
  const fail = (statusCode, error) => reply(statusCode, { error });

  function rateLimited(ip) {
    const current = now();
    const recent = (hits.get(ip) || []).filter((time) => current - time < 60_000);
    recent.push(current);
    hits.set(ip, recent);
    if (hits.size > 500) for (const [key, times] of hits) if (current - times[times.length - 1] > 60_000) hits.delete(key);
    return recent.length > MAX_VOTES_PER_MINUTE;
  }

  return async function handler(event) {
    const method = event?.httpMethod;
    if (!['GET', 'POST', 'DELETE'].includes(method)) return fail(405, 'Método no permitido.');

    const config = readEnv(env);
    if (!config) return fail(503, 'La puntuación desde la web no está configurada todavía.');

    const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
    if (method !== 'GET') {
      const origin = String(headers.origin || '').replace(/\/$/, '');
      if (!origin || !allowedOrigins(env).includes(origin)) return fail(403, 'Origen no permitido.');
    }

    let body = {};
    let voto = null;
    let titulo = '';
    let socio = '';
    if (method !== 'GET') {
      const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return fail(413, 'La petición es demasiado grande.');
      if (!String(headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
        return fail(400, 'La petición debe ser application/json.');
      }
      if (rateLimited(headers['x-nf-client-connection-ip'] || 'unknown')) {
        return fail(429, 'Demasiados votos seguidos. Espera un minuto e inténtalo de nuevo.');
      }
      try {
        body = JSON.parse(raw);
      } catch {
        return fail(400, 'La petición no es un JSON válido.');
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'La petición no es un JSON válido.');
      if (body.web) return fail(400, 'Petición rechazada.');
      titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
      socio = typeof body.socio === 'string' ? body.socio.trim() : '';
      if (!titulo || !socio) return fail(400, 'Faltan el libro o el socio.');
      if (method === 'DELETE') voto = null;
      else if (!('voto' in body)) return fail(400, 'Falta la nota.');
      else {
        const parsed = parseVote(body.voto);
        if (!parsed.ok) return fail(400, parsed.error);
        voto = parsed.voto;
      }
    }

    try {
      const token = await getAccessToken(config, fetchImpl, now());
      const base = `${SHEETS_URL}/${encodeURIComponent(config.sheetId)}`;
      const call = async (url, init = {}) => {
        const response = await fetchImpl(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!response.ok) throw new SheetsError(response.status, `Google Sheets HTTP ${response.status}`);
        return response.json();
      };
      const readValues = async (range) => (await call(
        `${base}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`,
      )).values || [];
      const writeUrl = (range, suffix = '') => `${base}/values/${encodeURIComponent(range)}${suffix}`;

      const rows = await readValues(`'${TAB}'!A1:ZZ`);
      if (method === 'GET') return reply(200, { socios: listMembers(rows) });

      const member = findMember(rows, socio);
      if (member.status === 'duplicate') return fail(409, `Hay dos socios que coinciden con «${socio}» en la hoja.`);
      if (member.status === 'missing') return fail(404, `No encuentro al socio «${socio}» en la hoja.`);

      // Only read books can be rated: not the current one, nor the candidates.
      const wanted = normalizeName(titulo);
      const current = getCurrentBook(rowsToRecords(await readValues('Actual')));
      if (current && normalizeName(current.titulo) === wanted) {
        return fail(403, 'Este es el libro actual: se podrá puntuar cuando el club lo termine.');
      }
      let candidates = [];
      try {
        const values = await readValues('Candidatos');
        candidates = parseRuletaRows(values.map((row) => Object.fromEntries(row.map((cell, index) => [`column${index}`, cell]))));
      } catch (error) {
        if (error.status === 403 || !(error instanceof SheetsError)) throw error;
        console.warn(`[vote] No se pudo leer "Candidatos": ${error.message}`);
      }
      if (candidates.some((candidate) => normalizeName(candidate.titulo) === wanted)) {
        return fail(403, 'Este libro es solo un candidato: aún no se puede puntuar.');
      }

      const book = findBookColumn(rows, titulo);
      if (book.status === 'duplicate') return fail(409, `Hay dos columnas que coinciden con «${titulo}» en la hoja.`);

      if (book.status === 'missing') {
        const catalog = createCatalogMap(rowsToRecords(await readValues('Medias')));
        const known = catalog.get(String(titulo).trim().toLocaleLowerCase());
        if (!known || voto === null) {
          if (known) return reply(200, { ok: true, titulo, socio, voto: null, anterior: null });
          return fail(404, `No encuentro el libro «${titulo}» en la hoja.`);
        }
        const header = rows[0] || [];
        let column = header.findIndex((cell, index) => index > 0 && String(cell ?? '').trim() === '') + 1;
        if (column === 0) column = header.length + 1;
        if (column < 2) column = 2;
        await call(`${base}/values:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            valueInputOption: 'RAW',
            data: [
              { range: `'${TAB}'!${columnToA1(column)}1`, values: [[known.titulo]] },
              { range: `'${TAB}'!${columnToA1(column)}${member.row}`, values: [[voto]] },
            ],
          }),
        });
        console.log(`[vote] ${socio} | ${known.titulo} | nueva columna | null -> ${voto}`);
        return reply(200, { ok: true, titulo: known.titulo, socio, voto, anterior: null, columnaNueva: true });
      }

      const anterior = cellVote(rows, member.row, book.column);
      const cell = `'${TAB}'!${columnToA1(book.column)}${member.row}`;
      if (voto === null) {
        if (anterior !== null) await call(writeUrl(cell, ':clear'), { method: 'POST', body: '{}' });
      } else {
        await call(writeUrl(cell, '?valueInputOption=RAW'), { method: 'PUT', body: JSON.stringify({ values: [[voto]] }) });
      }
      console.log(`[vote] ${socio} | ${titulo} | ${anterior} -> ${voto}`);
      return reply(200, { ok: true, titulo, socio, voto, anterior });
    } catch (error) {
      console.error('[vote]', error.message);
      if (error instanceof SheetsError && error.status === 403) {
        return fail(502, 'La cuenta de servicio no tiene permiso de edición en la hoja.');
      }
      return fail(502, 'No se pudo hablar con Google Sheets. Inténtalo de nuevo en un rato.');
    }
  };
}

module.exports = {
  columnToA1,
  createJwt,
  createVoteHandler,
  findBookColumn,
  findMember,
  getAccessToken,
  listMembers,
  normalizeName,
  parseVote,
  resetTokenCache,
};
