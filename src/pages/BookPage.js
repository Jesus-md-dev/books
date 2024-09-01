import Grid from '@mui/material/Grid2';
import * as React from 'react';
import { useMediaQuery } from 'react-responsive';
import { useParams } from 'react-router';
import useGoogleSheets from 'use-google-sheets';
import Loading from '../component/loading';


const BookList = () => {
    const { id } = useParams();
    const isMobile = useMediaQuery({ query: `(max-width: 760px)` });
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
    let book = data[0]['data'].filter((book) => book['id'] === id).shift();
    console.log(isMobile)

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
                <p>Desde el {book['inicio']} hasta el {book['fin']}</p>
                <h1>{book['titulo']}</h1>
                <p>{book['descripcion'].slice(0, book['descripcion'].slice(0, isMobile ? 100:500).lastIndexOf(" "))} ...</p>
                <p>MEDIA: 4.5</p>
            </div>
        </Grid>
    </Grid>
    </>
    )
}

export default BookList;