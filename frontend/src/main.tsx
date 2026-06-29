import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ConfirmProvider } from './components/ConfirmDialog';
import { Toaster } from './components/ui/sonner';
import { startSyncService } from './services/syncService';
import './index.css';

startSyncService();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <App />
        <Toaster richColors position="top-center" />
      </ConfirmProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
