const crypto = require('node:crypto');
const { handler: refreshBooks } = require('./books');

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

function unauthorized() {
  return {
    statusCode: 401,
    headers: { ...securityHeaders, 'WWW-Authenticate': 'Basic realm="Bahia Lectora admin", charset="UTF-8"' },
    body: 'Autenticación requerida',
  };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(event) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;

  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match) return false;

  let credentials;
  try {
    credentials = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    return false;
  }
  const separator = credentials.indexOf(':');
  if (separator < 0) return false;

  const username = credentials.slice(0, separator);
  const password = credentials.slice(separator + 1);
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
}

function adminPage() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Administración · Bahía Lectora</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, sans-serif; color: #17324d; background: #f4f7fb; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; }
    main { width: min(100%, 520px); padding: 36px; border: 1px solid #dbe4ef; border-radius: 18px; background: white; box-shadow: 0 16px 48px #17324d14; }
    h1 { margin: 0 0 12px; font-size: 1.6rem; }
    p { color: #52677d; line-height: 1.55; }
    button { margin-top: 12px; border: 0; border-radius: 10px; padding: 12px 18px; color: white; background: #1769aa; font: inherit; font-weight: 650; cursor: pointer; }
    button:disabled { cursor: wait; opacity: .65; }
    #status { min-height: 1.5em; margin-top: 18px; }
  </style>
</head>
<body>
  <main>
    <h1>Administración de Bahía Lectora</h1>
    <p>Consulta ahora las pestañas Libros, Actual y Medias para obtener los datos más recientes.</p>
    <button id="refresh" type="button">Forzar actualización</button>
    <p id="status" role="status" aria-live="polite"></p>
  </main>
  <script>
    const button = document.getElementById('refresh');
    const status = document.getElementById('status');
    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = 'Actualizando libros y metadatos…';
      try {
        const response = await fetch('/admin/refresh', { method: 'POST', credentials: 'same-origin' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'No se pudo actualizar.');
        status.textContent = 'Datos actualizados para ' + result.books + ' libros · ' + new Date(result.updatedAt).toLocaleTimeString('es-ES');
      } catch (error) {
        status.textContent = error.message || 'No se pudo actualizar. Inténtalo de nuevo.';
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

exports.handler = async (event) => {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 503,
      headers: { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Faltan ADMIN_USERNAME y ADMIN_PASSWORD en las variables de entorno.',
    };
  }
  if (!isAuthorized(event)) return unauthorized();

  if (event.httpMethod === 'POST') {
    const result = await refreshBooks({
      ...event,
      queryStringParameters: { ...event.queryStringParameters, forceMetadata: '1' },
    });
    if (result.statusCode !== 200) {
      let error = 'No se pudieron consultar las hojas de Google Sheets.';
      try {
        error = JSON.parse(result.body).error || error;
      } catch {
        // Keep the generic message if the books function returns plain text.
      }
      return {
        statusCode: result.statusCode,
        headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error }),
      };
    }

    let books = [];
    try {
      books = JSON.parse(result.body);
    } catch {
      return {
        statusCode: 502,
        headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: 'La función de actualización devolvió una respuesta inválida.' }),
      };
    }
    return {
      statusCode: 200,
      headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ books: books.length, updatedAt: new Date().toISOString() }),
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, POST' },
      body: JSON.stringify({ error: 'Método no permitido.' }),
    };
  }
  return {
    statusCode: 200,
    headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    body: adminPage(),
  };
};
