import { DataGrid } from '@mui/x-data-grid';
import { google } from 'googleapis';

const VISIBLE_FIELDS = ['name', 'rating', 'country', 'dateCreated', 'isAdmin'];


export async function getServerSideProps({ query }) {
  const auth = new google.auth.GoogleAuth({
    credentials:{
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "n")
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  const sheets = google.sheets({ version: 'v4', auth });
  const { id } = query;
  const range = 'Libro!A:Z';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  });

  const data = response.data.values;

  let parsedData = []

  for (let i = 1; i < data.length; i++) {
    const book = {};
    book['id'] = i;
    for (let j = 0; j < data[0].length; j++) {
      book[data[0][j]] = data[i][j];
    }
    parsedData.push(book);
  }
  return {
      props: {
        data: parsedData
      }
  }
}

function isValidHttpUrl(string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}



const columns = [
  {
    field: 'Nombre',
    headerName: 'Título',
    flex: 1,
    headerAlign: 'center',
    editable: true,
  },
  {
    field: 'Imagen',
    headerName: 'Portada',
    flex: 0,
    editable: true,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) =>
      <div className='flex w-auto max-h-full'>
        <img className='object-contain my-1' src={params.value}/>
      </div>
  },
  {
    field: 'Descripcion',
    headerName: 'Descripción',
    flex: 1,
    headerAlign: 'center',
    editable: true,
  },
  {
    field: 'Inicio',
    headerName: 'Inicio',
    flex: 0,
    headerAlign: 'center',
    editable: true,
  },
  {
    field: 'Fin',
    headerName: 'Fin',
    flex: 0,
    headerAlign: 'center',
    editable: true,
  },
  {
    field: 'Autor',
    headerName: 'Autor/a',
    flex: 1,
    headerAlign: 'center',
    editable: true,
  },
  {
    field: 'Paginas',
    headerName: 'Páginas',
    flex: 0,
    headerAlign: 'center',
    editable: true,
  }
];

const rows = [
  { id: 1, Nombre: 'Snow', Imagen: 'Jon', Descripcion: 14 },
];

export default function Post({ data }) {
  console.log(data)
  console.log(rows)

  return <article>
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
    {/* <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        {data.map((row, i) => (
          (() => {
            if (i === 0) {
              return (
                <TableHead>
                  <TableRow>
                    {row.map((element) => (
                      <TableCell align="center">{element}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
              );
            } else {
              return (
                <TableBody>
                  <TableRow>
                  {row.map((element) => (
                    <TableCell align="center">
                      {
                        isValidHttpUrl(element) ?
                        (<img src={element} alt="Element" />) :
                        (<span>{element}</span>)
                      }
                    </TableCell>
                  ))}
                  </TableRow>
                </TableBody>
              );
            }
          })()
        ))}
      </Table>
    </TableContainer> */}
  </article>
}
