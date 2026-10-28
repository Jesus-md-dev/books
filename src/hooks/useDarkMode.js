import { useEffect } from 'react';

/**
 * Temporarily forces light mode while dark mode styling is being repaired.
 * @returns {[boolean, Function]} [isDark, toggle]
 */
export function useDarkMode() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return [false, () => {}];
}
