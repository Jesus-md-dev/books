import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { google } from 'googleapis';
import Book from '../entity/book';

export async function getStartedBooks() {
    const auth = new google.auth.GoogleAuth({
    credentials:{
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "n")
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    })

    const sheets = google.sheets({ version: 'v4', auth });
    const range = 'Libro!A:Z';
    const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
    });

    const data = response.data.values;

    if (data.length > 0) {
        let books = []
        for (let i = 1; i < data.length; i++) {
            if (data[0][0]) books.push(Book.parseBook(data[i], data[0]));
        }
        books = books.filter((book) => book['id'] != undefined)
        return books.filter((book) => book['inicio'] != "" &&  book['inicio'] != undefined)
            .sort(function (a, b) {
                let dateA = a['inicio'].split('/')
                let dateB = b['inicio'].split('/')
                dateA = new Date(dateA[1] + '/' + dateA[0] + '/' + dateA[2])
                dateB = new Date(dateB[1] + '/' + dateB[0] + '/' + dateB[2])
                return dateB - dateA;
            }
        );
    }
    return []
}

export default async function Home() {
    let books = await getStartedBooks()
    let actual = books.shift()
    return(
        <>
        <h1 className='text-center my-3'>Lectura actual</h1>
        <Grid container>
            <Grid item xs={6} className='justify-center flex p-2'>
                <Button>
                    <div className='text-center text-black'>
                        <div className='flex w-auto max-h-full'>
                            <img className='object-contain my-1' src={actual['imagen']}/>
                        </div>
                        <h5>{actual['titulo']}</h5>
                        <h5>{actual['autor']} - {actual['paginas']} Páginas</h5>
                    </div>
                </Button>
            </Grid>
            <Grid item xs={6} className='flex flex-col p-2 text-center'>
            <h2>Lugar de la quedada</h2>
            {actual['direccion'] != undefined ?
            <iframe
                className='h-full m-5'
                src={`https://www.google.com/maps/embed/v1/place?key=***REMOVED***&q=${encodeURIComponent(actual['direccion'])}`}
                loading="lazy"
            ></iframe>
            :
            <div className='h-full m-5 flex justify-center items-center relative map'>
                <div className='absolute flex justify-center items-center w-full h-full'>
                    <h1 className='font-bold text-white'>Por definir</h1>
                </div>
                <iframe
                    className='h-full w-full'
                    src={`https://www.google.com/maps/embed/v1/place?key=***REMOVED***&q=${encodeURIComponent('ffffffffffffffffff')}`}
                    loading="lazy"
                ></iframe>
            </div>
            }
            </Grid>
        </Grid>
        <h1 className='text-center my-5'>Leidos anteriormente</h1>
        <Grid container>
            {books.map(book => {
                return (
                    <Grid key={book['id']} item xs={6} className='justify-center flex p-2'>
                        <Button>
                            <div className='text-center text-black'>
                                <div className='flex justify-center w-auto max-h-full'>
                                    <img className='object-contain my-1' src={book['imagen']}/>
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
}
