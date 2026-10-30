import { useCallback, useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'bahia-lectora:theme';
const QUERY = '(prefers-color-scheme: dark)';

const readStored = () => {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
};

const systemPrefersDark = () => {
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
};

/** Mirrors the choice on <html> (class used by Tailwind and the tokens) and the meta theme-color. */
const applyTheme = (isDark) => {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  // An explicit choice may differ from the system: make every theme-color meta follow it.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', isDark ? '#1e4a2a' : '#9fd1a6');
  });
};

/**
 * Dark mode state. Follows the system until the visitor chooses; the choice is
 * then saved in localStorage and wins over the system. The inline script in
 * index.html applies the same logic before first paint.
 * @returns {[boolean, Function]} [isDark, toggle]
 */
export function useDarkMode() {
  const [stored, setStored] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const isDark = stored ? stored === 'dark' : systemDark;

  useEffect(() => {
    let media;
    try {
      media = window.matchMedia(QUERY);
    } catch {
      return undefined;
    }
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const toggle = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setStored(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this visit only */
    }
  }, [isDark]);

  return [isDark, toggle];
}
