
import { useEffect, useState } from 'react';
import { getGoogleData } from './bookController';

/**
 * Custom React hook to manage and cache book data.
 * @param {Array} data - Raw data array.
 * @param {boolean} loading - Loading state.
 * @param {boolean} error - Error state.
 * @returns {[Array, Function]} Array of books and setter function.
 */
export function useBooksController(data, loading, error, dataActual) {
  const [dataBooks, setDataBooks] = useState([]);

  useEffect(() => {
    const cachedBooks = localStorage.getItem('dataBooks');
    if (cachedBooks && dataBooks.length === 0) {
      setDataBooks(JSON.parse(cachedBooks));
    }
  }, [dataBooks.length]);

  useEffect(() => {
    async function loadBooks() {
      const books = await getGoogleData(data, loading, error, dataActual, dataBooks);
      if (books && books.length > 0) {
        setDataBooks(books);
      }
    }
    loadBooks();
  }, [data, loading, error, dataActual, dataBooks]);

  return [dataBooks, setDataBooks];
}
