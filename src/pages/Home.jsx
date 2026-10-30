import { Link } from 'react-router-dom';
import NoService from '../component/noService';
import BookCover from '../component/BookCover';
import { useBooks } from '../data/BooksContext';
import { bookPath } from '../utils/bookPath';
import topRoto from '../assets/top.webp';
import bottomRoto from '../assets/bottom.webp';

// Google Maps Embed key: restrict it by HTTP referrer in Google Cloud, since it ships to the browser.
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;

const hasAuthor = (book) => book['autor'] && book['autor'] !== 'Desconocido';

/**
 * Home page component displaying current and previous books.
 * @returns {JSX.Element}
 */
const Home = () => {
  const dataBooks = useBooks();

  if (!dataBooks || dataBooks.length === 0) {
    return <NoService />;
  }

  const reversedBooks = [...dataBooks].reverse();
  const actual = reversedBooks[0];
  const dataBooksInverted = reversedBooks.slice(1);

  actual['direccion'] = 'Bahía de Cádiz';

  return (
    <div className="-mt-8 sm:-mt-10">
      <section aria-labelledby="conocenos">
        <h1 className="flex justify-center pt-6">
          <img src="/logo.webp" alt="Bahía Lectora" className="w-44 rounded-full shadow-md sm:w-56" width={224} height={224} loading="eager" />
        </h1>
        <img className="top-roto mt-4" src={topRoto} alt="" aria-hidden="true" width={2400} height={203} />
        <div className="paper-band text-center">
          <div className="content-center-straight">
            <h2 id="conocenos" className="section-title">Conócenos</h2>
            <p className="prose-text">
              Bahía Lectora es un club de lectura nacido en la Bahía de Cádiz, un lugar donde los libros se disfrutan mejor en compañía. Aquí compartimos lecturas, descubrimos autores y exploramos géneros diversos, siempre con la pasión por la literatura como brújula. Nuestra bitácora muestra la lectura actual y aquellas obras que ya nos han acompañado en el viaje: novelas que emocionan, relatos que hacen reflexionar y mundos que invitan a soñar. Este espacio es, ante todo, un encuentro entre lectores, un puerto donde las historias atracan para ser compartidas y donde cada página se convierte en conversación. Porque leer juntos es navegar más lejos.
            </p>
          </div>
        </div>
        <img className="bottom-roto" src={bottomRoto} alt="" aria-hidden="true" width={2400} height={262} />
      </section>

      <div className="content-center-straight mt-8">
        <section className="section" aria-labelledby="lectura-actual">
          <h2 id="lectura-actual" className="section-title">Lectura actual</h2>
          <div className="card mx-auto flex max-w-3xl flex-col items-center gap-6 md:flex-row md:items-stretch">
            <div className="flex flex-col items-center justify-center text-center md:w-1/2">
              <BookCover book={actual} size="lg" eager />
              <p className="mt-4 font-display text-xl font-bold">{actual['titulo']}</p>
              {hasAuthor(actual) && <p className="text-muted">{actual['autor']}</p>}
              <Link to={bookPath(actual['titulo'])} className="text-link mt-3">Ver ficha del libro</Link>
            </div>
            <div className="flex w-full flex-col items-center justify-center md:w-1/2">
              {actual['direccion'] !== undefined ?
                <iframe
                  title={`Mapa: ${actual['direccion']}`}
                  className="h-72 w-full max-w-sm rounded-2xl border border-line md:h-80"
                  src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(actual['direccion'])}&maptype=satellite`}
                  loading="lazy"
                ></iframe>
                :
                <div className="relative flex w-full max-w-sm items-center justify-center">
                  <p className="absolute z-[1] rounded-lg bg-surface/90 px-4 py-2 font-display text-2xl font-bold">Por definir</p>
                  <iframe
                    title="Mapa: provincia de Cádiz"
                    className="h-72 w-full rounded-2xl border border-line md:h-80"
                    src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent('Cádiz, provincia')}`}
                    loading="lazy"
                  ></iframe>
                </div>
              }
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="leidos">
          <h2 id="leidos" className="section-title">Leídos anteriormente</h2>
          <ul className="cover-grid">
            {dataBooksInverted.map((book) => (
              <li key={book['id']}>
                <BookCover book={book} caption={book['titulo']} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Home;
