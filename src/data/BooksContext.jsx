import { createContext, useContext, useEffect, useState } from 'react';
import initialBooks from './books.json';

const BooksContext = createContext(initialBooks);

export function BooksProvider({ children }) {
  const [books, setBooks] = useState(initialBooks);

  useEffect(() => {
    let active = true;
    let checking = false;

    const refreshBooks = async () => {
      if (!active || checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const response = await fetch('/.netlify/functions/books', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const latestBooks = await response.json();
        if (active && Array.isArray(latestBooks)) setBooks(latestBooks);
      } catch (error) {
        console.warn('[books] No se pudieron comprobar cambios:', error);
      } finally {
        checking = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshBooks();
    };

    refreshBooks();
    const intervalId = window.setInterval(refreshBooks, 60_000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshBooks);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshBooks);
    };
  }, []);

  return <BooksContext.Provider value={books}>{children}</BooksContext.Provider>;
}

export function useBooks() {
  return useContext(BooksContext);
}
