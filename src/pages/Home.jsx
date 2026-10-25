
import { useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import NoService from '../component/noService';
import dataBooks from '../data/books.json';
import topRoto from '../assets/top.svg';
import bottomRoto from '../assets/bottom.svg';

// Google Maps Embed key: restrict it by HTTP referrer in Google Cloud, since it ships to the browser.
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;

/**
 * Home page component displaying current and previous books.
 * @returns {JSX.Element}
 */
const Home = () => {
  let reversedBooks = [];
  let actual = null;
  let dataBooksInverted = [];

  useEffect(() => {
    dataBooks.forEach((book) => {
      const img = new Image();
      img.src = book['imagen'];
    });
  }, []);

  if (!dataBooks || dataBooks.length === 0) {
    return <NoService />;
  }

  reversedBooks = [...dataBooks].reverse();
  actual = reversedBooks[0];
  dataBooksInverted = reversedBooks.slice(1);

  actual['direccion'] = 'Bahía de Cádiz';

  return (
    <div>
      <div>
          <div className='flex justify-center'><img src="/logo.webp" alt="Bahía Lectora logo" className=" rounded-full w-56" loading='eager'/></div>
          <img className='top-roto' src={topRoto} alt='Top decoration' loading='eager'/>
          <div className='descripcion text-center'>
            <div className="content-center-straight">
              <h1 className="py-3">Conócenos</h1>
              Bahía Lectora es un club de lectura nacido en la Bahía de Cádiz, un lugar donde los libros se disfrutan mejor en compañía. Aquí compartimos lecturas, descubrimos autores y exploramos géneros diversos, siempre con la pasión por la literatura como brújula. Nuestra bitácora muestra la lectura actual y aquellas obras que ya nos han acompañado en el viaje: novelas que emocionan, relatos que hacen reflexionar y mundos que invitan a soñar. Este espacio es, ante todo, un encuentro entre lectores, un puerto donde las historias atracan para ser compartidas y donde cada página se convierte en conversación. Porque leer juntos es navegar más lejos.
            </div>
          </div>
          <img className='bottom-roto' src={bottomRoto} alt='Bottom decoration' loading='eager'/>
      </div>
      <div className='content-center-straight'>
        <p>
        </p>
        <h1 className="text-center my-3">Lectura actual</h1>
        <Grid container spacing={6} className="justify-center">
          <Grid key={actual['id']} size="auto" className="justify-center flex p-2 items-center">
              <a href={"/libro/" + actual['titulo']} className="flex items-center justify-center aspect-[13/19] h-60 w-auto">
                <div className="text-center text-black">
                  <div className="flex justify-center">
                    <img
                      className="my-1 border-4 border-slate-950"
                      src={actual['imagen']}
                      alt={actual['titulo']}
                      height={100}
                      width={150}
                      loading="eager"
                    />
                  </div>
                </div>
              </a>
            </Grid>
              <Grid size="auto" className='flex flex-col p-2 text-center items-center'>
              {actual['direccion'] !== undefined ?
              <iframe
                  title='google-maps'
                  className='h-80 max-w-xs w-full my-1 rounded-3xl'
                  src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(actual['direccion'])}&maptype=satellite`}
                  loading="eager"
              ></iframe>
              :
              <div className='h-full m-5 flex justify-center items-center relative map'>
                  <div className='absolute flex justify-center items-center w-full h-full'>
                      <h1 className='font-bold text-white'>Por definir</h1>
                  </div>
                  <iframe
                      title='google-maps'
                      className='h-80 max-w-xs w-full my-1'
                      src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=cadiz,provincia}`}
                      loading="lazy"
                  ></iframe>
              </div>
              }
              </Grid>
        </Grid>
        <h1 className="text-center my-5">Leidos anteriormente</h1>
        <Grid container spacing={6} className="justify-center">
          {dataBooksInverted.map(book => (
            <Grid key={book['id']} size="auto" className="justify-center flex p-2">
              <a href={"/libro/" + book['titulo']} className="flex items-center justify-center aspect-[13/19] h-60 w-auto">
                <div className="text-center text-black">
                  <div className="flex justify-center">
                    <img
                      className="my-1 border-4 border-slate-950"
                      src={book['imagen']}
                      alt={book['titulo']}
                      height={100}
                      width={150}
                      loading='lazy'
                    />
                  </div>
                </div>
              </a>
            </Grid>
          ))}
        </Grid>
      </div>
    </div>
  );
};

export default Home;