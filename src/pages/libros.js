import { DataGrid } from '@mui/x-data-grid';
import { google } from 'googleapis';
import Book from '../entity/book';

export async function getServerSideProps({ query }) {
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

    return {
        props: {
          data: books
        }
    }
  }
  return {
      props: {
        data: []
      }
  }
}

const columns = [
  {
    field: 'titulo',
    headerName: 'Título',
    flex: 1,
    editable: true,
  },
  {
    field: 'imagen',
    headerName: 'Portada',
    flex: 0,
    editable: true,
    align: 'center',
    renderCell: (params) =>
      <div className='flex w-auto max-h-full'>
        <img className='object-contain my-1' src={params.value}/>
      </div>
  },
  {
    field: 'descripcion',
    headerName: 'Descripción',
    flex: 2,
    editable: true,
  },
  {
    field: 'autor',
    headerName: 'Autor/a',
    flex: 1,
    editable: true,
  },
  {
    field: 'paginas',
    headerName: 'Páginas',
    flex: 0,
    editable: true,
  },
  {
    field: 'inicio',
    headerName: 'Inicio',
    flex: 0,
    editable: true,
  },
  {
    field: 'fin',
    headerName: 'Fin',
    flex: 0,
    editable: true,
  },
  {
    field: 'leido',
    headerName: 'Leído',
    flex: 0,
    editable: true,
  },
  {
    field: 'editar',
    headerName: '',
    flex: 0,
    editable: true,
  }
];

const rows = [
  { id: 1, Nombre: 'Snow', Imagen: 'Jon', Descripcion: 14 },
];

export default function Post({ data }) {
  return(
    <>
    <article>
        <DataGrid
          rowHeight={150}
          rows={data}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[5]}
          checkboxSelection
          disableRowSelectionOnClick
        />
    </article>
    </>
  )
}
