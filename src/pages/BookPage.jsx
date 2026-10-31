
import { Link, useParams } from 'react-router-dom';
import Stars from '../component/stars';
import { useBooks } from '../data/BooksContext';
import comentariosData from '../data/comentarios.json';
import ShareButton from '../component/ShareButton';
import { bookPath } from '../utils/bookPath';
import './BookPage.css';
import NoService from '../component/noService';
import topRoto from '../assets/top.webp';
import bottomRoto from '../assets/bottom.webp';

function normalizeBookTitle(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase();
}


/**
 * BookPage component displaying details and ratings for a single book.
 * @returns {JSX.Element}
 */
const BookPage = () => {
    const dataBooks = useBooks();
    const { id } = useParams();
    let book = null;

    if (!dataBooks || dataBooks.length === 0) {
        return <NoService />;
    }

    if (dataBooks && dataBooks.length > 0) {
        book = dataBooks.find((gridBook) => normalizeBookTitle(gridBook.titulo) === normalizeBookTitle(id));
    }

    if (!book) {
        return (
            <div className="content-center-straight">
                <div className="card mx-auto max-w-md text-center">
                    <h1 className="mb-3 text-2xl">Libro no encontrado</h1>
                    <Link to="/libros" className="text-link">Ver la lista de libros</Link>
                </div>
            </div>
        );
    }

    // Destructure with fallback values
    const {
        imagen = '',
        titulo = '',
        autor = '',
        descripcion = '',
        fecha_publicacion = '-',
        categorias = [],
        editorial = '-',
        n_paginas = '-',
        media,
        votos = [],
        preguntas = []
    } = book || {};

    // Build-time comments from the "Comentarios" tab, keyed by the book title.
    const comentarios = comentariosData[titulo] || [];

    let sumSub = true;
    votos.forEach(voto => {
        let value = sumSub ?
            voto.nombre.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360 +
            titulo.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360 :
            voto.nombre.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360 -
            titulo.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360
        sumSub = !sumSub;
        voto.hue = Math.abs(value) % 360 + 'deg';
    });

    const details = [
        ['Fecha de publicación', fecha_publicacion],
        ['Categorías', categorias.join(', ')],
        ['Editorial', editorial],
        ['Páginas', n_paginas],
    ].filter(([, value]) => value !== '' && value !== undefined && value !== null);

    return (
        <article>
            <div className='content-center-straight flex min-h-[calc(40vh+3rem)] flex-col items-center sm:min-h-[33rem]'>
                <img
                    className="book-image cover-img object-contain"
                    src={imagen}
                    alt={`Portada de ${titulo}`}
                    loading="eager"
                />
            </div>
            <div>
                <img className='top-roto' src={topRoto} alt="" aria-hidden="true" width={2400} height={203} />

                <div className="paper-band text-center">
                    <div className='content-center-straight'>
                        <h1 className="mb-1">{titulo}</h1>
                        {autor && autor !== 'Desconocido' && <p className="text-lg text-muted">{autor}</p>}
                        {descripcion && <p className="prose-text mt-4 text-left sm:text-center">{descripcion}</p>}
                        <div className="mt-4 flex justify-center">
                            <ShareButton
                                path={bookPath(titulo)}
                                title={titulo}
                                text={autor && autor !== 'Desconocido' ? `${titulo}, de ${autor}` : titulo}
                            />
                        </div>
                        <dl className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            {details.map(([label, value]) => (
                                <div key={label} className="rounded-lg border border-line bg-surface px-3 py-2">
                                    <dt className="font-semibold text-muted">{label}</dt>
                                    <dd className="break-words">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>

                <img className='bottom-roto' src={bottomRoto} alt="" aria-hidden="true" width={2400} height={262} />
            </div>
            <div className='content-center-straight flex flex-col items-center'>
                {media !== 0 && (
                    <section className="media flex flex-col text-center" aria-labelledby="media-title">
                        <h2 id="media-title">Media</h2>
                        <p className="mt-1 flex flex-col items-center gap-1 text-xl font-bold">
                            <Stars n={media} /> {media}
                        </p>
                    </section>
                )}
                {votos.length > 0 && (
                    <section className="mt-6 w-full" aria-labelledby="votos-title">
                        <h2 id="votos-title" className="section-title">Valoraciones</h2>
                        <ul className="flex flex-wrap justify-evenly">
                            {votos.map(puntuation => (
                                <li
                                    key={puntuation['nombre']}
                                    className="voto flex justify-center"
                                    style={{
                                        '--hue': `${puntuation['hue']}`
                                    }}
                                >
                                    <div className="text-center">
                                        <h3 className="text-lg">{puntuation['nombre']}</h3>
                                        <p className="mt-1 flex flex-col items-center gap-1 font-bold">
                                            <Stars n={puntuation['voto']} /> {puntuation['voto']}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                {Array.isArray(preguntas) && preguntas.length > 0 && (
                    <section className="mt-10 w-full max-w-3xl" aria-labelledby="preguntas-title">
                        <h2 id="preguntas-title" className="section-title">Preguntas para la reunión</h2>
                        <ol className="mt-4 flex list-decimal flex-col gap-3 rounded-lg border border-line bg-surface py-3 pl-10 pr-4 text-left">
                            {preguntas.map((pregunta, index) => (
                                <li key={index} className="break-words pl-1">{pregunta}</li>
                            ))}
                        </ol>
                    </section>
                )}
                {comentarios.length > 0 && (
                    <section className="mt-10 w-full max-w-3xl" aria-labelledby="comentarios-title">
                        <h2 id="comentarios-title" className="section-title">Comentarios del club</h2>
                        <ul className="mt-4 flex flex-col gap-3">
                            {comentarios.map((comentario, index) => (
                                <li key={`${comentario.socio}-${index}`} className="rounded-lg border border-line bg-surface px-4 py-3 text-left">
                                    <blockquote className="whitespace-pre-line break-words">{comentario.comentario}</blockquote>
                                    {comentario.socio && (
                                        <p className="mt-2 text-sm font-semibold text-muted">— {comentario.socio}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </article>
    );
};

export default BookPage;
