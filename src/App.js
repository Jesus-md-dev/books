// App.js

import { Route, Routes, Navigate } from 'react-router-dom';
import BookList from './pages/BookList';
import BookPage from './pages/BookPage';
import DrawBook from './pages/DrawBook';
import Home from './pages/Home';
import "./App.css";
import TestPage from './pages/TestPage';


const App = () => {

   return (
      <>
         <link rel="dns-prefetch" href="https://books.google.com"></link>
         <link rel="dns-prefetch" href="https://sheets.googleapis.com"></link>
         <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/libros" element={<BookList />} />
            <Route path="/libro/:id" element={<BookPage />} />
            <Route path="/sorteo" element={<DrawBook />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
      </>
   );
};

export default App;