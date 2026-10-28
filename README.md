# Bahía Lectora

Website for a book club, live at **[bahia-lectora.jzmarquez.com](https://bahia-lectora.jzmarquez.com/)**. It shows the book the club is reading now, where the next meeting is, every book read so far with the members' ratings, and a random draw to pick the next one.

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=flat-square&logo=googlesheets&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)

![Screenshot of the Bahía Lectora home page](docs/screenshot.png)

## How it works

The club manages everything in a Google Sheet, so nobody needs an admin panel:

1. **At build time**, `scripts/fetchBooksData.js` reads the votes (`Libros`), the current book (`Actual`) and book titles/authors (`Medias`) from Google Sheets, computes each book's average rating and fills in covers and other details from the **Google Books API**. The `Medias` table pairs `titulo` with `autor`; that author is used to find the right edition and takes precedence over Google Books metadata. `Actual` can contain `Título` and `Autor` columns; its author takes precedence for the current book. Results are cached by title, so unchanged books don't hit the API again.
2. It writes everything to `src/data/books.json`, which is the initial data and supplies book details such as covers.
3. A Netlify Function checks the `Libros`, `Actual` and `Medias` tabs when a visitor opens the site and once per minute while it stays open. It reads the publicly readable sheets through Google's Visualization endpoint; the browser never contacts Sheets directly.

Changes to those sheets appear within about a minute on an open page, or on the next visit. A new deployment is needed for code changes and refreshed book details from Google Books.

## Features

- Current book with a Google Maps view of the meeting place
- Full history of books read, with filters and per-book pages (with their own Open Graph tags for sharing)
- Member and statistics pages
- Random book draw
- Dark mode

## Getting started

```bash
npm install
npm start           # regenerates src/data/books.json and starts the dev server
npm run build       # regenerates the data and builds to build/
npm run preview     # serves the production build locally
npm run fetch-books # only regenerates src/data/books.json
```

Create a `.env` file with:

| Variable | Used for |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | Optional; uses the official Sheets API, with the public endpoint as fallback |
| `GOOGLE_API_KEY` | Optional; Google Books metadata enrichment during builds and when new titles load |
| `GOOGLE_TRANSLATE_API_KEY` | Optional; translates imported descriptions and unrecognized categories into Spanish. Common Google Books categories are translated locally. If omitted, `GOOGLE_API_KEY` is reused |
| `BAHIA_SHEETS_ID` | Optional; spreadsheet ID. Defaults to the original spreadsheet |
| `VITE_GOOGLE_MAPS_EMBED_KEY` | Google Maps embed on the home page (shipped to the browser, so restrict it by HTTP referrer) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Required in Netlify to protect `/admin` with HTTP Basic Auth |

The private `/admin` page has a button to query the latest data from all three
book tabs immediately. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Netlify's
environment variables; the page and its refresh endpoint return an error until
both are configured.

The existing `Medias` tab should have three columns, in this order: `Título`, `Autor`, `Media`. Add one book per row by entering its title and author; `Media` is calculated from the votes. The title identifies the book and should match its column in `Libros`. The `Libros` headers and average formulas are prefilled for up to 49 books, so no second title entry or extra tab is needed. ISBN is not required. If an author is missing, the site falls back to a title-based Google Books lookup.

See [WARP.md](WARP.md) for the full architecture notes.

## Deployment

Netlify runs `npm run build` and publishes `build/`. The build and Netlify Function use the same spreadsheet, defaulting to the original spreadsheet; set `BAHIA_SHEETS_ID` under *Site configuration → Environment variables* only to override it. `GOOGLE_SHEETS_API_KEY` is optional but preferred for the official Sheets API. `GOOGLE_API_KEY` enables Google Books metadata enrichment during builds and for newly added titles at runtime. Common categories are translated locally; enable Cloud Translation and set `GOOGLE_TRANSLATE_API_KEY` to translate descriptions and other category labels. The Google Books key is used as a fallback.
