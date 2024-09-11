// App.js
import { Route, Routes } from 'react-router-dom';
import "./App.css";
import BookList from './pages/BookList';
import BookPage from './pages/BookPage';
import Home from './pages/Home';
import DrawBook from './pages/DrawBook';

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