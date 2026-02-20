/**
 * main.tsx
 * Vite entry point. Mounts the React application into the #root div.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global CSS reset / font smoothing
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
