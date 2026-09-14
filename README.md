# Bahía Lectora

Web del club de lectura, construida con React + Vite. Los datos de libros y votaciones se leen de Google Sheets y se enriquecen con la API de Google Books **en build time**, no en el navegador.

Ver [WARP.md](WARP.md) para la arquitectura completa, variables de entorno necesarias y comandos de desarrollo.

## Comandos rápidos

```bash
npm install
npm start          # regenera src/data/books.json y arranca el servidor de desarrollo
npm run build      # regenera src/data/books.json y genera /build para producción
npm run preview    # sirve el build de producción en local
```

Necesitas un `.env` con `GOOGLE_API_KEY`, `DATA_SHEET_ID` y `GOOGLE_BOOK_SHEET_ID` (detalles en WARP.md).
