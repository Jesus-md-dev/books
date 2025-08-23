import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import App from './App';
import './index.css';
import Footer from './layout/Footer';
import Navigation from './layout/Navigation';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Navigation></Navigation>
    <div maxWidth="xl" className='content'>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
    </div>
    <Footer></Footer>
  </React.StrictMode>

);

reportWebVitals();
