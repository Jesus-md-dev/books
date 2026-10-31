import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import initialBooks from './books.json';
import { applyVoteToBooks, reconcileVotes } from '../utils/bookVotes';

const BooksContext = createContext(initialBooks);
const BooksActionsContext = createContext({ refreshBooks: async () => {}, applyVote: () => {} });

export function BooksProvider({ children }) {
  const [books, setBooks] = useState(initialBooks);
  const checkingRef = useRef(false);
  const activeRef = useRef(true);
  // Votes sent from this browser that the refreshed data does not include yet.
  const pendingVotes = useRef([]);

  const refreshBooks = useCallback(async () => {
    if (!activeRef.current || checkingRef.current || document.visibilityState === 'hidden') return;
    checkingRef.current = true;
    try {
      const response = await fetch('/.netlify/functions/books', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const latestBooks = await response.json();
      if (activeRef.current && Array.isArray(latestBooks)) {
        const reconciled = reconcileVotes(latestBooks, pendingVotes.current);
        pendingVotes.current = reconciled.pending;
        setBooks(reconciled.books);
      }
    } catch (error) {
      console.warn('[books] No se pudieron comprobar cambios:', error);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // Shows the vote at once and checks the sheet again a few seconds later.
  const applyVote = useCallback((titulo, nombre, voto) => {
    pendingVotes.current = [
      ...pendingVotes.current.filter((vote) => !(vote.titulo === titulo && vote.nombre === nombre)),
      { titulo, nombre, voto },
    ];
    setBooks((current) => applyVoteToBooks(current, titulo, nombre, voto));
    window.setTimeout(refreshBooks, 3000);
  }, [refreshBooks]);

  useEffect(() => {
    activeRef.current = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshBooks();
    };

    refreshBooks();
    const intervalId = window.setInterval(refreshBooks, 60_000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshBooks);

    return () => {
      activeRef.current = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshBooks);
    };
  }, [refreshBooks]);

  const actions = useMemo(() => ({ refreshBooks, applyVote }), [refreshBooks, applyVote]);

  return (
    <BooksContext.Provider value={books}>
      <BooksActionsContext.Provider value={actions}>{children}</BooksActionsContext.Provider>
    </BooksContext.Provider>
  );
}

export function useBooks() {
  return useContext(BooksContext);
}

export function useBooksActions() {
  return useContext(BooksActionsContext);
}
