import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { escutarPainel } from '@/lib/theme';
import App from './App.tsx';

// Dentro do Painel Benenutri o tema muda por postMessage também na tela de entrada (design SKILL, "Tema sincronizado").
escutarPainel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
