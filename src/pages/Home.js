import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import * as React from 'react';
import useGoogleSheets from 'use-google-sheets';
import Loading from '../component/loading';
import Book from '../entity/book';

const Home = () => {
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
      books = books.filter((book) => book['inicio'] !== "" &&  book['inicio'] !== undefined)
          .sort(function (a, b) {
              let dateA = a['inicio'].split('/')
              let dateB = b['inicio'].split('/')
              dateA = new Date(dateA[1] + '/' + dateA[0] + '/' + dateA[2])
              dateB = new Date(dateB[1] + '/' + dateB[0] + '/' + dateB[2])
              return dateB - dateA;
          }
      );
  }

  let actual = books.shift()
    return(
        <>
        <h1 className='text-center my-3'>Lectura actual</h1>
        <Grid container spacing={6} className="justify-center">
            <Grid key={actual['id']} size="auto" className='justify-center flex p-2'>
                <Button href={'/libro/' + actual['id']}>
                    <div className='text-center text-black'>
                        <div className='flex justify-center w-auto max-h-full'>
                            <img className='my-1 h-80 lg:border-[15px] border-8 border-slate-950' src={actual['imagen']} alt={actual['titulo']}/>
                        </div>
                        <h5>{actual['titulo']}</h5>
                        <h5>{actual['autor']} - {actual['paginas']} Páginas</h5>
                    </div>
                </Button>
            </Grid>
            <Grid size="auto" className='flex flex-col p-2 text-center items-center'>
            {actual['direccion'] !== undefined ?
            <iframe
                title='google-maps'
                className='h-80 max-w-xs w-full my-1'
                src={`https://www.google.com/maps/embed/v1/place?key=***REMOVED***&q=${encodeURIComponent(actual['direccion'])}`}
                loading="lazy"
            ></iframe>
            :
            <div className='h-full m-5 flex justify-center items-center relative map'>
                <div className='absolute flex justify-center items-center w-full h-full'>
                    <h1 className='font-bold text-white'>Por definir</h1>
                </div>
                <iframe
                    title='google-maps'
                    className='h-80 max-w-xs w-full my-1'
                    src={`https://www.google.com/maps/embed/v1/place?key=***REMOVED***&q=${encodeURIComponent('ffffffffffffffffff')}`}
                    loading="lazy"
                ></iframe>
            </div>
            }
            <h2>Lugar de la quedada</h2>
            </Grid>
        </Grid>
        <h1 className='text-center my-5'>Leidos anteriormente</h1>
        <Grid container spacing={6} className="justify-center">
            {books.map(book => {
                return (
                    <Grid key={book['id']} size="auto" className='justify-center flex p-2'>
                        <Button href={'/libro/' + book['id']}>
                            <div className='text-center text-black'>
                                <div className='flex justify-center w-auto max-h-full'>
                                    <img className='my-1 h-80 lg:border-[15px] border-8 border-slate-950' src={book['imagen']} alt={book['titulo']}/>
                                </div>
                                <h5>{book['titulo']}</h5>
                                <h5>{book['autor']} - {book['paginas']} Páginas</h5>
                            </div>
                        </Button>
                    </Grid>
                );
            })}
        </Grid>
        </>
    )
};

export default Home;