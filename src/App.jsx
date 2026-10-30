// App.js

import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Loading from './component/loading';
import PageMeta from './component/PageMeta';
import "./App.css";
import { BooksProvider } from './data/BooksContext';

// Home stays eager (landing page); the rest load on demand.
const BookList = lazy(() => import('./pages/BookList'));
const BookPage = lazy(() => import('./pages/BookPage'));
const DrawBook = lazy(() => import('./pages/DrawBook'));
const Stats = lazy(() => import('./pages/Stats'));
const Members = lazy(() => import('./pages/Members'));


const App = () => {

   return (
      <BooksProvider>
      <>
         <PageMeta />
         <Suspense fallback={<Loading />}>
         <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/libros" element={<BookList />} />
            <Route path="/libro/:id" element={<BookPage />} />
            <Route path="/sorteo" element={<DrawBook />} />
            <Route path="/estadisticas" element={<Stats />} />
            <Route path="/socios" element={<Members />} />
            <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
         </Suspense>
         <link rel="dns-prefetch" href="https://books.google.com"></link>
         <link rel="dns-prefetch" href="https://sheets.googleapis.com"></link>
      </>
      </BooksProvider>
   );
};

export default App;
