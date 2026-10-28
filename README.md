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

1. **At build time**, `scripts/fetchBooksData.js` reads the votes and the current book from Google Sheets, computes each book's average rating and fills in covers, authors and other details from the **Google Books API**. Results are cached by title, so unchanged books don't hit the API again.
2. It writes everything to `src/data/books.json`, which is the initial data and supplies book details such as covers.
3. When a visitor opens the site, a Netlify Function checks the current sheet values and refreshes ratings/current-book data if they changed. It reads the publicly readable sheets through Google's Visualization endpoint; the browser never contacts Sheets directly.

Sheet changes appear the next time someone opens the site. A new deployment is still needed for code changes and refreshed book details from Google Books.

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
| `DATA_SHEET_ID` | Sheet with the current book |
| `GOOGLE_BOOK_SHEET_ID` | Sheet with the votes |
| `VITE_GOOGLE_MAPS_EMBED_KEY` | Google Maps embed on the home page (shipped to the browser, so restrict it by HTTP referrer) |

See [WARP.md](WARP.md) for the full architecture notes.

## Deployment

Netlify runs `npm run build` and publishes `build/`. Set `DATA_SHEET_ID` and `GOOGLE_BOOK_SHEET_ID` under *Site configuration → Environment variables*; they must be available to Netlify Functions at runtime. `GOOGLE_SHEETS_API_KEY` is optional but preferred for the official Sheets API. `GOOGLE_API_KEY` enables Google Books metadata enrichment during builds and for newly added titles at runtime.
