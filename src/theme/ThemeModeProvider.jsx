import { createContext, useContext, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { useDarkMode } from '../hooks/useDarkMode';
import { lightTheme, darkTheme } from './index';

const ThemeModeContext = createContext({ isDark: false, toggle: () => {} });

/** Mounts the MUI theme matching the colour mode and shares the toggle with the app. */
export const ThemeModeProvider = ({ children }) => {
  const [isDark, toggle] = useDarkMode();
  const value = useMemo(() => ({ isDark, toggle }), [isDark, toggle]);
  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeModeContext);
