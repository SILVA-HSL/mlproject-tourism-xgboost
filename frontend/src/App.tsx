/**
 * App.tsx
 * Root application component.
 * Sets up the Material UI theme and renders the Dashboard page.
 */

import React, { useMemo, useState } from 'react';
import { createTheme, ThemeProvider, PaletteMode, Box, CssBaseline, IconButton, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Dashboard from './pages/Dashboard';

// ─── Theme factory ─────────────────────────────────────────────────────────────

function buildTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#9c27b0',
      },
      background: {
        default: mode === 'light' ? '#f4f6fb' : '#0f172a',
        paper: mode === 'light' ? '#ffffff' : '#1e293b',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === 'light'
                ? '0 1px 4px rgba(0,0,0,0.08)'
                : '0 1px 4px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'small',
        },
      },
    },
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [mode, setMode] = useState<PaletteMode>('light');
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Dark-mode toggle – fixed in top-right corner */}
      <Box sx={{ position: 'fixed', top: 12, right: 16, zIndex: 9999 }}>
        <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          <IconButton
            onClick={() => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
            color="inherit"
            size="small"
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {mode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      <Dashboard />
    </ThemeProvider>
  );
};

export default App;
