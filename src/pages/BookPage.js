import Grid from '@mui/material/Grid2';
import useGoogleSheets from 'use-google-sheets';
import Loading from '../component/loading';
import Stars from '../component/stars';
import { useEffect, useState } from 'react';
import { getGoogleData } from '../controller/bookController';
import { useParams } from 'react-router-dom';



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
        return <div>Error!</div>;
    }

    if (!book) {
        return <div>Libro no encontrado.</div>;
    }

    return (
        <div className="lg:mx-[20%]">
            <Grid container spacing={2}>
                <Grid size={4}>
                    <div className="flex w-auto max-h-full">
                        <img
                            className="object-contain my-1 h-full lg:border-[15px] border-8 border-slate-950"
                            src={book['imagen']}
                            alt={book['titulo']}
                        />
                    </div>
                </Grid>
                <Grid size={8}>
                    <div className="w-auto text-center">
                        <h1>{book['titulo']}</h1>
                        <p className="mt-2">
                            {book['titulo'].slice(0, book['titulo'].slice(0, 500).lastIndexOf(' '))} ...
                        </p>
                        {book['media'] && (
                            <div className="flex flex-col text-center text-black mt-2">
                                <h2>Media</h2>
                                <h3>
                                    <Stars n={book['media']} className="ml-1" /> ({book['media']})
                                </h3>
                            </div>
                        )}
                    </div>
                </Grid>
            </Grid>
            <Grid container spacing={6} className="justify-center mt-10">
                {book['votos'].map(puntuation => (
                    <Grid key={puntuation['nombre']} size="auto" className="justify-center flex p-2">
                        <div className="text-center text-black">
                            <h1>{puntuation['nombre']}</h1>
                            <h3>
                                <Stars n={puntuation['voto']} /> ({puntuation['voto']})
                            </h3>
                        </div>
                    </Grid>
                ))}
            </Grid>
        </div>
    );
};

export default BookPage;