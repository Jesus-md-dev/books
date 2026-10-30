import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import App from './App';
import './index.css';
import Footer from './layout/Footer';
import Navigation from './layout/Navigation';
import { ThemeModeProvider } from './theme/ThemeModeProvider';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeModeProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        <Navigation />
        <main id="contenido" tabIndex={-1} className='content'>
          <App />
        </main>
        <Footer />
      </BrowserRouter>
    </ThemeModeProvider>
  </React.StrictMode>

);

reportWebVitals();
