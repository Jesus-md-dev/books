const crypto = require('node:crypto');

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
    <p>Vuelve a leer Libros, Actual y Medias y regenera las portadas y los metadatos de todos los libros antes de publicar una nueva versión.</p>
    <button id="refresh" type="button">Forzar actualización</button>
    <p id="status" role="status" aria-live="polite"></p>
  </main>
  <script>
    const button = document.getElementById('refresh');
    const status = document.getElementById('status');
    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = 'Consultando las hojas y actualizando los datos…';
      try {
        const response = await fetch('/admin/refresh', { method: 'POST', credentials: 'same-origin' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'No se pudo actualizar.');
        status.textContent = result.buildTriggered
          ? 'Regeneración completa solicitada. La web se actualizará al terminar el despliegue.'
          : 'No se ha podido iniciar la regeneración.';
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
    const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
    if (!buildHookUrl) {
      return {
        statusCode: 503,
        headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: 'Falta NETLIFY_BUILD_HOOK_URL. Configura el build hook indicado en el README.' }),
      };
    }
    try {
      const response = await fetch(buildHookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedBy: 'bahia-lectora-admin' }),
      });
      if (!response.ok) throw new Error(`Netlify build hook HTTP ${response.status}`);
    } catch (error) {
      return {
        statusCode: 502,
        headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: 'No se pudo iniciar el build de Netlify. Revisa el build hook.' }),
      };
    }
    return {
      statusCode: 202,
      headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ buildTriggered: true, requestedAt: new Date().toISOString() }),
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
