import useGoogleSheets from 'use-google-sheets';


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
