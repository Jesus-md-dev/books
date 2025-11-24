// App.js

import { Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import "./App.css";
import Loading from './component/loading';

// Code-split routes for better performance
const Home = lazy(() => import('./pages/Home'));
const BookList = lazy(() => import('./pages/BookList'));
const BookPage = lazy(() => import('./pages/BookPage'));
const DrawBook = lazy(() => import('./pages/DrawBook'));
const AdminPage = lazy(() => import('./pages/AdminPage'));


const App = () => {

   return (
      <Suspense fallback={<Loading />}>
         <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/libros" element={<BookList />} />
            <Route path="/libro/:id" element={<BookPage />} />
            <Route path="/sorteo" element={<DrawBook />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
      </Suspense>
   );
};

export default App;