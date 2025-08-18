
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import Loading from '../component/loading';
import useGoogleSheets from 'use-google-sheets';
import { getGoogleData } from '../controller/bookController';

const columns = [
  {
    field: 'titulo',
    headerName: 'Título',
    flex: 1,
    minWidth: 200,
    editable: false,
  },
  {
    field: 'imagen',
    headerName: 'Portada',
    flex: 1,
    minWidth: 100,
    editable: false,
    align: 'center',
    renderCell: (params) => (
      <Button href={'/libro/' +  params.row.titulo} className='flex justify-center w-auto h-full'>
        <img alt="Portada libro" className='object-contain my-1 h-full' src={params.value}/>
      </Button>
    ),
  },
  {
    field: 'media',
    headerName: 'Media',
    flex: 1,
    minWidth: 100,
    editable: false,
    align: 'center',
  },
  {
    field: 'autor',
    headerName: 'Autor/a',
    flex: 1,
    minWidth: 100,
    editable: false,
  },
];



/**
 * BookList page component displaying books in a data grid.
 * @returns {JSX.Element}
 */
const BookList = () => {
  const [dataBooks, setDataBooks] = useState([]);

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

  if (loading && dataBooks.length === 0) {
    return <Loading />;
  }

  if (error) {
    return <div>Error!</div>;
  }

  return (
    <DataGrid
      className="bg-white"
      rowHeight={150}
      rows={dataBooks}
      columns={columns}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 10,
          },
        },
        sorting: {
          sortModel: [{ field: 'titulo', sort: 'asc' }],
        },
      }}
      pageSizeOptions={[10]}
    />
  );
};

export default BookList;