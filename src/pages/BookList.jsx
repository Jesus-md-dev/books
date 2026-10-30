
import { useState } from 'react';
import Button from '@mui/material/Button';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import NoService  from '../component/noService';
import { useBooks } from '../data/BooksContext';
import { loadColumnVisibility, saveColumnVisibility } from '../utils/columnVisibility';

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
    field: 'n_paginas',
    headerName: 'Páginas',
    flex: 0.6,
    minWidth: 90,
    editable: false,
    align: 'center',
    headerAlign: 'center',
    valueFormatter: (value) => value || '—',
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
  const dataBooks = useBooks();
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() =>
    loadColumnVisibility(columns.map((column) => column.field))
  );

  /**
   * Updates the visible columns and remembers the choice in this browser.
   * @param {Record<string, boolean>} model - New visibility model.
   */
  const handleColumnVisibilityChange = (model) => {
    setColumnVisibilityModel(model);
    saveColumnVisibility(model);
  };

  if (!dataBooks || dataBooks.length === 0) {
    return <NoService />;
  }

  return (
    <div className="content-center-straight">
      <DataGrid
        className="bg-white"
        rowHeight={150}
        rows={dataBooks}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={handleColumnVisibilityChange}
        slots={{ toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
          },
        }}
        localeText={esES.components.MuiDataGrid.defaultProps.localeText}
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
