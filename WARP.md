# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Bahía Lectora is a React + Vite static site for a book club. It displays the
current book, past books, and per-user ratings. All Google Sheets / Google
Books data is fetched **at build time** (not in the browser) and baked into
`src/data/books.json`.

## Development Commands

### Environment Setup
```bash
npm install
```

Create a `.env` file with (no `REACT_APP_` prefix — these are build-time only, never shipped to the browser):
```
GOOGLE_API_KEY=your_google_api_key
DATA_SHEET_ID=the_sheet_id_with_Data_and_Actual_tabs
GOOGLE_BOOK_SHEET_ID=the_sheet_id_with_Libros_tab
```

The Google Maps embed on the home page also needs `VITE_GOOGLE_MAPS_EMBED_KEY` (this one is shipped to the browser, so restrict it by HTTP referrer in Google Cloud).

### Development
```bash
npm start          # Regenerates src/data/books.json, then starts Vite dev server
npm run build      # Regenerates src/data/books.json, then builds to /build
npm run preview    # Serve the production build locally
npm run fetch-books # Just regenerate src/data/books.json without starting anything
```

## Architecture Overview

### Data Flow
1. **`scripts/fetchBooksData.js`** (Node, runs via `prestart`/`prebuild`): reads
   votes from the "Libros" tab and the current book from the "Actual" tab via
   the Google Sheets REST API, computes per-book aggregated ratings, and
   enriches missing covers/authors/etc. via the Google Books API. Caches
   previously-enriched fields by title so repeat builds don't re-hit Google
   Books for books that haven't changed. Writes `src/data/books.json`.
2. **Pages** (`Home`, `BookList`, `BookPage`, `DrawBook`) import
   `src/data/books.json` directly — no runtime fetch, no loading spinners, no
   API keys in the shipped bundle.

There is **no admin page and no write path from the browser**. Editing votes
happens directly in the "Libros"/"Actual" Google Sheet tabs. On every page
load, `netlify/functions/books.js` checks those tabs and the shared React
context updates the pages with the latest ratings and current book. The Sheets
API key and sheet IDs must be configured as runtime environment variables for
the Netlify Function. Static generated data remains the fallback if the check
fails.

### Key Directories
```
src/
├── pages/           # Route-level components (.jsx)
├── layout/          # Navigation and Footer
├── component/       # Reusable UI components
├── data/            # books.json — generated, do not hand-edit
scripts/
└── fetchBooksData.js
```

### Styling
- Tailwind CSS (via `postcss.config.js` + `tailwind.config.js`)
- Material-UI components
- Custom CSS in `App.css` / `index.css`

## Deployment (Netlify)

- Build command: `npm run build` (the `prebuild` hook regenerates the data automatically)
- Publish directory: `build` (Vite is configured with `build.outDir: 'build'` to match)
- Required environment variables (Site settings → Environment variables):
  `GOOGLE_API_KEY`, `DATA_SHEET_ID`, `GOOGLE_BOOK_SHEET_ID`, `VITE_GOOGLE_MAPS_EMBED_KEY`
- `_redirects` in `public/` handles SPA client-side routing fallback
