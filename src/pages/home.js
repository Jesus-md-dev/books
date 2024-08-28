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

        <Grid container>
            <Grid item xs={7} className='justify-center flex'>
                <div className='text-center'>
                    <div className='flex w-auto max-h-full'>
                        <img className='object-contain my-1' src={actual['imagen']}/>
                    </div>
                    <div>{actual['titulo']}</div>
                    <div>{actual['autor']} - {actual['paginas']} Páginas</div>
                </div>
            </Grid>
            <Grid item xs={5} className='justify-center flex'>
                MAPA
            </Grid>
        </Grid>
        <Grid container>
            {books.map(book => {
                return (
                    <Grid item xs={6} className='justify-center flex'>
                    <div className='text-center'>
                        <div className='flex w-auto max-h-full'>
                            <img className='object-contain my-1' src={book['imagen']}/>
                        </div>
                        <div>{book['titulo']}</div>
                        <div>{book['autor']} - {book['paginas']} Páginas</div>
                    </div>
                    </Grid>
                );
            })}
        </Grid>
        </>
    )
}
