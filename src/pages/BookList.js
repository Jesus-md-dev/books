import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import * as React from 'react';
import useGoogleSheets from 'use-google-sheets';
import Loading from '../component/loading';

const columns = [
  {
    field: 'titulo',
    headerName: 'Título',
    flex: 1,
    minWidth: 200,
    editable: true,
  },
  {
    field: 'imagen',
    headerName: 'Portada',
    flex: 1,
    minWidth: 100,
    editable: true,
    align: 'center',
    renderCell: (params) =>
      <Button href={'/libro/' +  params.id} className='flex justify-center w-auto h-full'>
        <img alt="Portada libro" className='object-contain my-1 h-full' src={params.value}/>
      </Button>

  },
  {
    field: 'media',
    headerName: 'Media',
    flex: 1,
    minWidth: 100,
    editable: true,
    align: 'center',
  },
  {
    field: 'autor',
    headerName: 'Autor/a',
    flex: 1,
    minWidth: 100,
    editable: true,
  },
  {
    field: 'paginas',
    headerName: 'Páginas',
    flex: 0.5,
    minWidth: 50,
    editable: true,
  },
  {
    field: 'inicio',
    headerName: 'Inicio',
    flex: 0.5,
    minWidth: 100,
    editable: true,
  },
  {
    field: 'fin',
    headerName: 'Fin',
    flex: 0.5,
    minWidth: 100,
    editable: true,
  },
  {
    field: 'leido',
    headerName: 'Leído',
    flex: 0.5,
    editable: true,
    renderCell: (params) => {
      if (params.value === "si") {
        return (
          <div className='flex h-full'>
            <img alt="Instagram" width="" height="" src="/tick.svg" className='w-[50%]'></img>
          </div>
        );
      }
      return (
        <div className='flex h-full'>
          <img alt="Instagram" width="" height="" src="/reading.svg" className='w-[50%]'></img>
        </div>
      );
    }
  },
  // {
  //   field: 'editar',
  //   headerName: '',
  //   flex: 0,
  //   editable: true,
  // }
];

const BookList = () => {
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
  let books = data[0]['data']

  if (data.length > 0) {
      console.log(books)
      books = books.filter((book) => book['id'] !== undefined)
      for (let index = 0; index < books.length; index++) {
        books[index]['media'] = Math.round(Math.random()*5*100)/100
      }
  }

  return(
    <>
        <DataGrid
          className='bg-white'
          rowHeight={150}
          rows={books}
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
          checkboxSelection
          disableRowSelectionOnClick
        />
    </>
  )
}

export default BookList;