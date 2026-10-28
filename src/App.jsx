// App.js

import { Route, Routes, Navigate } from 'react-router-dom';
import BookList from './pages/BookList';
import BookPage from './pages/BookPage';
import DrawBook from './pages/DrawBook';
import Home from './pages/Home';
import Stats from './pages/Stats';
import Members from './pages/Members';
import "./App.css";
import { BooksProvider } from './data/BooksContext';


const App = () => {

   return (
      <BooksProvider>
      <>
         <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/libros" element={<BookList />} />
            <Route path="/libro/:id" element={<BookPage />} />
            <Route path="/sorteo" element={<DrawBook />} />
            <Route path="/estadisticas" element={<Stats />} />
            <Route path="/socios" element={<Members />} />
            <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
         <link rel="dns-prefetch" href="https://books.google.com"></link>
         <link rel="dns-prefetch" href="https://sheets.googleapis.com"></link>
      </>
      </BooksProvider>
   );
};

export default App;
