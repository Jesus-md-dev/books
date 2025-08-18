import { useEffect, useState } from 'react';
import Book from '../entity/book';
import Button from '@mui/material/Button';
import Loading from '../component/loading';
import useGoogleSheets from 'use-google-sheets';
import './DrawBook.css';
import { useBooksController } from '../controller/useBooksController';

import NoService  from '../component/noService';


function getNRandomItems(items, n) {
    let array = []
    for (let index = 0; index < n && items.length > 0; index++) {
        let random = Math.floor(Math.random() * (items.length));
        array.push(items[random]);
        items.splice(random, 1);
    }
    return array;
}

const DrawBook = () => {
  const [dataBooks, setDataBooks] = useState([]);

  const { data, loading, error } = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
    sheetsOptions: [{ id: 'Libros' }],
  });

  useEffect(() => {
    const fetchBooks = async () => {
      let cachedBooks = localStorage.getItem('dataBooks');
      while (!cachedBooks || cachedBooks.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('No books found, checking cache...');
        cachedBooks = localStorage.getItem('dataBooks');
      }
      if (cachedBooks && dataBooks.length === 0) {
        setDataBooks(JSON.parse(cachedBooks));
      }
    };
    fetchBooks();
    // eslint-disable-next-line
  }, []);

  useBooksController(data, loading, error);

  if (loading && dataBooks.length === 0) {
    return <Loading />;
  }

  if (error) {
    return <NoService />;
  }

  let books = data[0]['data']

  if (data.length > 0) {

      for (let i = 1; i < data.length; i++) {
          if (data[0][0]) books.push(Book.parseBook(data[i], data[0]));
      }
      books = books.filter((book) => book['id'] !== undefined)
  }

  let drawList = books.map(a => ({...a}));
  drawList = getNRandomItems(drawList, 10);

  const startDraw = (e) => {
    e.preventDefault();
    const startBtn = document.getElementsByClassName('start')[0];
    const stopBtn = document.getElementsByClassName('stop')[0];
    startBtn.classList.add('hidden-element')
    stopBtn.classList.remove('hidden-element')
    const container = document.getElementsByClassName('scroll-container')[0];
    if (container) {
        container.classList.remove('hidden-element')
    }
  }

  const stopDraw = (e) => {
    e.preventDefault();
    const restartSection = document.getElementsByClassName('restart')[0];
    const stopBtn = document.getElementsByClassName('stop')[0];
    stopBtn.classList.add('hidden-element')
    restartSection.classList.remove('hidden-element')
    const container = document.getElementsByClassName('scroll-container')[0];
    if (container) {
        container.classList.add('hidden-element')
    }
  }

  let bookResult = 0;

  const restartDraw = (e) => {
    e.preventDefault();
    const restartSection = document.getElementsByClassName('restart')[0];
    const startBtn = document.getElementsByClassName('start')[0];
    restartSection.classList.add('hidden-element')
    startBtn.classList.remove('hidden-element')
    const container = document.getElementsByClassName('scroll-container')[0];
    if (container) {
        container.classList.add('hidden-element')
    }
    bookResult = Math.floor(Math.random() * (books.length));
  }

  bookResult = Math.floor(Math.random() * (books.length));

    return(
        <>

        <div className='mt-[20vh]'>
            <div className='flex flex-col items-center restart hidden-element'>
                <div className='h-96 w-96 flex items-center justify-center relative'>
                    <div className='flex flex-col justify-center items-center text-center text-black carousel-card absolute z-10 result'>
                        <img className='my-1 w-24' src={books[bookResult]['imagen']} alt={books[bookResult]['titulo']}/>
                        <h5>{books[bookResult]['titulo']}</h5>
                        <h5>{books[bookResult]['autor']} - {books[bookResult]['paginas']} Páginas</h5>
                    </div>
                    <img alt="octagram" className='octogram h-80 w-80' src="./octogran.png"/>
                </div>
                <div className='h-full flex items-center justify-center'>
                    <Button variant="contained" color="success" onClick={restartDraw}>
                        Reiniciar
                    </Button>
                </div>
            </div>
            <div className='h-full flex items-center justify-center start mt-[24rem]'>
                <Button className='' variant="contained" color="success" onClick={startDraw}>
                    Iniciar sorteo
                </Button>
            </div>
            <div className='flex justify-center'>
                <div className="scroll-container hidden-element carousel">
                    <div className="carousel-primary">
                        {drawList.map((book) => {
                            return (
                                <div key={"primary-" + book['id']} className='text-center text-black carousel-card'>
                                    <div className='flex justify-center w-auto max-h-full'>
                                        <img className='my-1 h-80 lg:border-[15px] border-8 border-slate-950' src={book['imagen']} alt={book['titulo']}/>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="carousel-primary carousel-secondary">
                        {drawList.map((book) => {
                            return (
                                <div key={"secondary-" + book['id']} className='text-center text-black carousel-card'>
                                    <div className='flex justify-center w-auto max-h-full'>
                                        <img className='my-1 h-80 lg:border-[15px] border-8 border-slate-950' src={book['imagen']} alt={book['titulo']}/>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className='h-full flex items-center justify-center stop hidden-element'>
                <Button variant="contained" color="success" onClick={stopDraw}>
                    Mostrar resultado
                </Button>
            </div>
        </div>
        </>
    )
};

export default DrawBook;