import Button from '@mui/material/Button';
import * as React from 'react';
import useGoogleSheets from 'use-google-sheets';
import Loading from '../component/loading';
import Book from '../entity/book';
import './DrawBook.css';


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
  const { data, loading, error } = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
    sheetsOptions: [{ id: 'Libro' }],
  });

  if (loading) {
    return(
      <Loading></Loading>
    );
  }

  if (error) {
    return <div>Error!</div>;
  }

  let books = data[0]['data']

  if (data.length > 0) {

      for (let i = 1; i < data.length; i++) {
          if (data[0][0]) books.push(Book.parseBook(data[i], data[0]));
      }
      books = books.filter((book) => book['id'] !== undefined)
  }

  books = getNRandomItems(books, 10);

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

  const stoptDraw = (e) => {
    e.preventDefault();
    const startBtn = document.getElementsByClassName('start')[0];
    const stopBtn = document.getElementsByClassName('stop')[0];
    stopBtn.classList.add('hidden-element')
    startBtn.classList.remove('hidden-element')
    const container = document.getElementsByClassName('scroll-container')[0];
    if (container) {
        container.classList.add('hidden-element')
    }
  }

    return(
        <>
        <div className='mt-[20vh]'>
            <div className='h-full flex items-center justify-center start'>
                <Button variant="contained" color="success" onClick={startDraw}>
                    Iniciar sorteo
                </Button>
            </div>
            <div className='flex justify-center'>
                <div className="scroll-container hidden-element">
                    <div className="carousel-primary">
                        {books.map((book) => {
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
                        {books.map((book) => {
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
                <Button variant="contained" color="success" onClick={stoptDraw}>
                    Mostrar resultado
                </Button>
            </div>
        </div>
        </>
    )
};

export default DrawBook;