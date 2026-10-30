import { createTheme } from '@mui/material/styles';
import tokens from './tokens.json';

const c = tokens.light;
const sans = tokens.fonts.sans.join(', ');
const display = tokens.fonts.display.join(', ');

/**
 * Light MUI theme built from the same tokens as Tailwind (tokens.json), so MUI
 * components (Button, Menu, DataGrid...) and Tailwind classes share one palette.
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: c.primary, dark: c['primary-strong'], contrastText: c['on-primary'] },
    success: { main: c.primary, dark: c['primary-strong'], contrastText: c['on-primary'] },
    error: { main: c.danger },
    text: { primary: c.ink, secondary: c.muted },
    background: { default: c.canvas, paper: c.surface },
    divider: c.line,
  },
  typography: {
    fontFamily: sans,
    h1: { fontFamily: display },
    h2: { fontFamily: display },
    h3: { fontFamily: display },
    h4: { fontFamily: display },
    h5: { fontFamily: display },
    h6: { fontFamily: display },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': { outline: `3px solid ${c.focus}`, outlineOffset: 2 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          backgroundColor: c.surface,
          borderColor: c.line,
          borderRadius: 12,
          '--DataGrid-containerBackground': c['brand-soft'],
          '--DataGrid-rowBorderColor': c.line,
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
          '& .MuiDataGrid-row:hover': { backgroundColor: `${c['brand-soft']}66` },
          '& .MuiDataGrid-toolbarContainer': { padding: 8, gap: 8, flexWrap: 'wrap' },
        },
      },
    },
  },
});

export default theme;
