
import { useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Loading from '../component/loading';
import NoService  from '../component/noService';
import { useFetchBooks } from '../controller/bookDataController';


/**
 * Home page component displaying current and previous books.
 * @returns {JSX.Element}
 */
const Home = () => {
  const [dataBooks, setDataBooks] = useState([]);

  useFetchBooks().then((books) => {
    setDataBooks(books);
  });

  if (dataBooks && dataBooks.length === 0) {
    return <Loading />;
  }

  if (!dataBooks) {
    return <NoService />;
  }

  return (
    <>
      <h1 className="text-center my-3">Lectura actual</h1>
      <Grid container spacing={6} className="justify-center">
        {/* <Grid key={actual['id']} size="auto" className='justify-center flex p-2'>
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
                    src={`https://www.google.com/maps/embed/v1/place?key=***REMOVED***&q=cadiz,provincia}`}
                    loading="lazy"
                ></iframe>
            </div>
            }
            <h2>Lugar de la quedada</h2>
            </Grid> */}
      </Grid>
      <h1 className="text-center my-5">Leidos anteriormente</h1>
      <Grid container spacing={6} className="justify-center">
        {dataBooks.map(book => (
          <Grid key={book['id']} size="auto" className="justify-center flex p-2">
            <Button href={"/libro/" + book['titulo']}>
              <div className="text-center text-black">
                <div className="flex justify-center w-auto max-h-full">
                  <img
                    className="my-1 h-80 lg:border-[15px] border-8 border-slate-950"
                    src={book['imagen']}
                    alt={book['titulo']}
                  />
                </div>
              </div>
            </Button>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default Home;