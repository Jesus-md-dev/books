import useGoogleSheets from 'use-google-sheets';

// Old placeholder that needs to be replaced in cache
const OLD_PLACEHOLDER = 'https://i.pinimg.com/736x/e0/e9/78/e0e978256054db86ff9690df51d6cd8d.jpg';
const NEW_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="196" viewBox="0 0 128 196"%3E%3Crect width="128" height="196" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%23fff" text-anchor="middle" dominant-baseline="middle"%3ESin portada%3C/text%3E%3C/svg%3E';

/**
 * Migrate cached books to use new optimized placeholder
 */
function migrateCachedPlaceholders() {
  try {
    const cached = localStorage.getItem('dataBooks');
    if (cached) {
      const books = JSON.parse(cached);
      let updated = false;
      
      books.forEach(book => {
        if (book.imagen === OLD_PLACEHOLDER) {
          book.imagen = NEW_PLACEHOLDER;
          updated = true;
        }
      });
      
      if (updated) {
        localStorage.setItem('dataBooks', JSON.stringify(books));
        console.log('Migrated cached book placeholders to optimized SVG');
      }
    }
  } catch (err) {
    console.warn('Failed to migrate cached placeholders:', err);
  }
}

// Run migration on module load
migrateCachedPlaceholders();


/**
 * Custom React hook to manage and cache book data.
 * @returns {[Array, Function]} Array of books and setter function.
 */
export function useFetchBooks() {

  const { data, loading, error } = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_DATA_SHEET_ID,
    sheetsOptions: [{ id: 'Data' }],
  });

  return new Promise((resolve) => {
    const cachedBooks = localStorage.getItem('dataBooks');
    let books = [];
    if (!loading && !error && data && data[0] && data[0].data) {
      books = JSON.parse(data[0]['data'][0]['dataJson']);
      if (cachedBooks && cachedBooks.length > 0 && books.length === cachedBooks.length) {
        resolve(JSON.parse(cachedBooks));
      } else {
        resolve(books);
      }
    } else {
      resolve([]);
    }
  });
}
