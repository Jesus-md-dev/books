
import { useParams } from 'react-router-dom';
import Grid from '@mui/material/Grid2';
import Stars from '../component/stars';
import { useBooks } from '../data/BooksContext';
import './BookPage.css';
import NoService from '../component/noService';
import topRoto from '../assets/top.svg';
import bottomRoto from '../assets/bottom.svg';

function normalizeBookTitle(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
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
        return <div>Libro no encontrado.</div>;
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
        votos = []
    } = book || {};

    let sumSub = true;
    votos.forEach(voto => {
        let value = sumSub ?
            voto.nombre.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360 +
            titulo.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360 :
            voto.nombre.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360 -
            titulo.split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("") % 360
        sumSub = !sumSub;
        voto.hue = Math.abs(value) % 360 + 'deg';
        console.log(`Rotation de ${voto.nombre}: ${voto.hue}`);
    });

    return (
        <div>
            <div className='content-center-straight flex flex-col items-center'>
                <div className="flex w-auto max-h-full">
                    <img
                        className="book-image object-contain my-1 h-full border-4 border-slate-950"
                        src={imagen}
                        alt={titulo}
                    />
                </div>
            </div>
            <div>
                <img className='top-roto' src={topRoto} alt='Top decoration' />

                <div className="w-auto text-center descripcion">
                    <div className='content-center-straight'>
                        <h1>{titulo}</h1>
                        {autor && autor !== 'Desconocido' && <p><b>Autor/a:</b> {autor}</p>}
                        <p className="mt-2">
                            {descripcion}
                        </p>
                        <p><b>Fecha de publicación:</b> {fecha_publicacion}</p>
                        <p><b>Categorías:</b> {categorias.join(', ')}</p>
                        <p className="mt-2">
                            <b>Editorial:</b> {editorial} - <b>Páginas:</b> {n_paginas}
                        </p>
                    </div>
                </div>

                <img className='bottom-roto' src={bottomRoto} alt='Bottom decoration' />
            </div>
            <div className='content-center-straight flex flex-col items-center'>
                {media !== 0 && (
                    <div className="media flex flex-col text-center text-black mt-2 ">
                        <h1>Media</h1>
                        <h3>
                            <Stars n={media} className="ml-1" /> {media}
                        </h3>
                    </div>
                )}
                <Grid container className="justify-evenly mt-10">
                    {votos.map(puntuation => (
                        <Grid
                            key={puntuation['nombre']}
                            size="auto"
                            className={"voto justify-center flex p-2"}
                            style={{
                                '--hue': `${puntuation['hue']}`
                            }}
                        >
                            <div className="text-center text-black">
                                <h3>{puntuation['nombre']}</h3>
                                <h4>
                                    <Stars n={puntuation['voto']} /> {puntuation['voto']}
                                </h4>
                            </div>
                        </Grid>
                    ))}
                </Grid>
            </div>
        </div>
    );
};

export default BookPage;
