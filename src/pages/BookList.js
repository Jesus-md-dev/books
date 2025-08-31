
import { useState } from 'react';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import Loading from '../component/loading';
import NoService  from '../component/noService';
import { useFetchBooks } from '../controller/bookDataController';

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

  useFetchBooks().then((books) => {
      setDataBooks(books);
  });

  if (dataBooks && dataBooks.length === 0) {
    return <Loading />;
  }

  if (!dataBooks) {
    return <NoService />;
  }

  return (
    <div className="content-center-straight">
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
    </div>
  );
};

export default BookList;