import Grid from '@mui/material/Grid2';
import * as React from 'react';
import { useMediaQuery } from 'react-responsive';
import { useParams } from 'react-router';
import useGoogleSheets from 'use-google-sheets';
import Loading from '../component/loading';
import Stars from '../component/stars';

const BookList = () => {
    const { id } = useParams();
    const isMobile = useMediaQuery({ query: `(max-width: 760px)` });
    const { data, loading, error } = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
    sheetsOptions: [{ id: 'Libro' }],
    });
    const media_puntuation = useGoogleSheets({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
        sheetsOptions: [{ id: 'MediaPuntuacion' }],
    });

    const puntuations = useGoogleSheets({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
        sheetsOptions: [{ id: 'Puntuacion' }],
    });


    if (loading || media_puntuation['loading'] || puntuations['loading']) {
        return(
            <Loading></Loading>
        );
    }

    if (error || media_puntuation['error'] || puntuations['error']) {
        return <div>Error!</div>;
    }

    let book = data[0]['data'].filter((book) => book['id'] === id).shift();

    let book_media = media_puntuation['data'][0]['data']
        .filter((punt) => punt['lid'] === id).shift();

    let book_puntuations = puntuations['data'][0]['data']
        .filter((punt) => punt['lid'] === id);

    return(
    <>
    {isMobile}
    <Grid container spacing={2} className="lg:mx-[20%]">
        <Grid size={4}>
        <div className='flex w-auto max-h-full'>
            <img className='object-contain my-1 h-full lg:border-[15px] border-8 border-slate-950' src={book['imagen']} alt={book['titulo']}/>
        </div>
        </Grid>
        <Grid size={8}>
            <div className='w-auto text-center'>
                <p>Desde el {book['inicio']}
                    {
                        book['fin'] ?
                            <span> hasta el {book['fin']}</span> :
                            <span> hasta por definir</span>
                    }</p>
                <h1>{book['titulo']}</h1>
                <p className='mt-2'>{book['descripcion'].slice(0, book['descripcion'].slice(0, isMobile ? 100:500).lastIndexOf(" "))} ...</p>
                    {(book_media && book_media !== []) && <div className='flex flex-col text-center text-black mt-2'>
                            <h2>MEDIA</h2>
                            <div>
                                <Stars n={book_media['promedio']} className="ml-1"></Stars>
                            </div>
                        </div>
                    }
            </div>
        </Grid>
    </Grid>
    <Grid container spacing={6} className="justify-center mt-10">
        {book_puntuations.map(puntuation => {
                return (
                    <Grid key={puntuation['uid']} size="auto" className='justify-center flex p-2'>
                        <div className='text-center text-black'>
                            <h1>{puntuation['uid']}</h1>
                            <h1>
                                <Stars n={puntuation['puntuacion']}></Stars>
                            </h1>
                        </div>
                    </Grid>
                );
            })}
        </Grid>
    </>
    )
}

export default BookList;