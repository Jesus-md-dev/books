import { useEffect, useState } from 'react';

function getInitialDarkMode() {
  try {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
  } catch (e) {
    // localStorage unavailable (private browsing, etc.) - fall through to system preference.
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Manages dark mode state, persisted in localStorage and reflected as a
 * `dark` class on the root element for Tailwind's `dark:` variants.
 * @returns {[boolean, Function]} [isDark, toggle]
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('darkMode', String(isDark));
    } catch (e) {
      // ignore
    }
  }, [isDark]);

  return [isDark, () => setIsDark((prev) => !prev)];
}
