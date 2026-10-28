import { createContext, useContext, useEffect, useState } from 'react';
import initialBooks from './books.json';

const BooksContext = createContext(initialBooks);

export function BooksProvider({ children }) {
  const [books, setBooks] = useState(initialBooks);

  useEffect(() => {
    let active = true;
    fetch('/.netlify/functions/books', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((latestBooks) => {
        if (active && Array.isArray(latestBooks)) setBooks(latestBooks);
      })
      .catch((error) => console.warn('[books] No se pudieron comprobar cambios:', error));
    return () => { active = false; };
  }, []);

  return <BooksContext.Provider value={books}>{children}</BooksContext.Provider>;
}

export function useBooks() {
  return useContext(BooksContext);
}
