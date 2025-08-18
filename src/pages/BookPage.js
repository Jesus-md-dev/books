
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Grid from '@mui/material/Grid2';
import Loading from '../component/loading';
import Stars from '../component/stars';
import useGoogleSheets from 'use-google-sheets';
import { getGoogleData } from '../controller/bookController';
import './BookPage.css';
import NoService  from '../component/noService';

/**
 * BookPage component displaying details and ratings for a single book.
 * @returns {JSX.Element}
 */
const BookPage = () => {
    const [dataBooks, setDataBooks] = useState([]);
    const { id } = useParams();
    let book = null;

    const { data, loading, error } = useGoogleSheets({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
        sheetsOptions: [{ id: 'Libros' }],
    });

    useEffect(() => {
        const cachedBooks = localStorage.getItem('dataBooks');
        if (cachedBooks && dataBooks.length === 0) {
            setDataBooks(JSON.parse(cachedBooks));
        }
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        async function loadBooks() {
            const books = await getGoogleData(data, loading, error, dataBooks);
            if (books && books.length > 0) {
                setDataBooks(books);
            }
        }
        loadBooks();
        // eslint-disable-next-line
    }, [data, loading, error]);


    if (dataBooks && dataBooks.length > 0) {
        dataBooks.forEach(gridBook => {
            if (gridBook['titulo'] === id) book = gridBook;
        });
    }


    if (loading && dataBooks.length === 0) {
        return <Loading />;
    }

    if (error) {
        return <NoService />;
    }

    if (!book) {
        return <div>Libro no encontrado.</div>;
    }

    // Destructure with fallback values
    const {
        imagen = '',
        titulo = '',
        descripcion = '',
        fecha_publicacion = '-',
        categorias = [],
        editorial = '-',
        n_paginas = '-',
        media,
        votos = []
    } = book || {};

    return (
        <div className="lg:mx-[10%] flex flex-col items-center">
          
                    <div className="flex w-auto max-h-full">
                        <img
                            className="book-image object-contain my-1 h-full lg:border-[15px] border-8 border-slate-950"
                            src={imagen}
                            alt={titulo}
                        />
                    </div>
              
                    <div className="w-auto text-center">
                        <h1>{titulo}</h1>
                        <p className="mt-2">
                            {descripcion}
                        </p>
                        <p><b>Fecha de publicación:</b> {fecha_publicacion}</p>
                        <p><b>Categorías:</b> {categorias.join(', ')}</p>
                        <p className="mt-2">
                            <b>Editorial:</b> {editorial} - <b>Páginas:</b> {n_paginas}
                        </p>
                    </div>
  
            {media && (
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
                            '--hue': `${puntuation['nombre'].split('(')[0].replace(' ', '').split("").map(ch => ch.charCodeAt(0)).join("")}deg`
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
    );
};

export default BookPage;