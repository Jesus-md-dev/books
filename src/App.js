// App.js

import { Route, Routes } from 'react-router-dom';
import BookList from './pages/BookList';
import BookPage from './pages/BookPage';
import DrawBook from './pages/DrawBook';
import Home from './pages/Home';
import "./App.css";

const App = () => {
   return (
      <>
         <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/libros" element={<BookList />} />
            <Route path="/libro/:id" element={<BookPage />} />
            <Route path="/sorteo" element={<DrawBook />} />
         </Routes>
      </>
   );
};

export default App;