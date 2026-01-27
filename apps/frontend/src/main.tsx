import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from '@features/auth';
import App from './App';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './index.css';

/**
 * Caladrius Health AI Studio - Main Entry Point
 *
 * Provider hierarchy:
 * 1. React.StrictMode - Development checks
 * 2. BrowserRouter - Client-side routing
 * 3. ThemeProvider - Material-UI theming
 * 4. AuthProvider - Authentication state management
 * 5. App - Main application with CopilotProvider
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
