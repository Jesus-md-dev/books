import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { Button, Chip, Drawer, InputAdornment, MenuItem, TextField, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import NoService  from '../component/noService';
import BookFilters from '../component/BookFilters';
import { useBooks } from '../data/BooksContext';
import { loadColumnVisibility, saveColumnVisibility } from '../utils/columnVisibility';
import { bookPath } from '../utils/bookPath';
import {
  DEFAULT_SORT, PAGE_RANGES, PAGE_SIZE, RATING_OPTIONS, SORT_OPTIONS,
  applyFilters, clampPage, countActiveFilters, facetCounts, getCategories, getVoters,
  parseFilters, serializeFilters, sortIdForField, withDerivedFields,
} from '../utils/bookFilters';

const formatNumber = (value) => Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });

const baseColumns = [
  {
    field: 'titulo',
    headerName: 'Título',
    flex: 1,
    minWidth: 200,
    editable: false,
    renderCell: (params) => (
      <Link to={bookPath(params.row.titulo)} className='font-semibold text-ink underline-offset-2 hover:underline' tabIndex={params.tabIndex}>
        {params.value}
      </Link>
    ),
  },
  {
    field: 'imagen',
    headerName: 'Portada',
    flex: 1,
    minWidth: 100,
    editable: false,
    sortable: false,
    align: 'center',
    renderCell: (params) => (
      <Link to={bookPath(params.row.titulo)} className='flex h-full w-auto justify-center rounded py-2' tabIndex={params.tabIndex}>
        <img alt={`Portada de ${params.row.titulo}`} className='h-full rounded-sm object-contain shadow' src={params.value} loading='lazy' width={90} height={134} />
      </Link>
    ),
  },
  {
    field: 'media',
    headerName: 'Media',
    flex: 1,
    minWidth: 100,
    editable: false,
    align: 'center',
    type: 'number',
    headerAlign: 'center',
    // Numeric value (not the "4.25" string) so it sorts as a number; unrated books are null.
    valueGetter: (value, row) => row.nota_num,
    valueFormatter: (value, row) => (value === null || value === undefined ? '—' : `${formatNumber(value)} (${row.n_votos})`),
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

const USER_FIELDS = baseColumns.map((column) => column.field);

/**
 * Compares sort/filter state to avoid writing the same URL twice.
 * @param {URLSearchParams} a
 * @param {URLSearchParams} b
 * @returns {boolean}
 */
const sameParams = (a, b) => a.toString() === b.toString();

/**
 * BookList page: filterable, sortable and pageable catalogue whose state lives in the URL.
 * @returns {JSX.Element}
 */
const BookList = () => {
  const dataBooks = useBooks();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() => loadColumnVisibility(USER_FIELDS));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filterButtonRef = useRef(null);

  const books = useMemo(() => withDerivedFields(dataBooks || []), [dataBooks]);
  const filters = useMemo(() => parseFilters(searchParams, books), [searchParams, books]);
  const options = useMemo(() => ({ categories: getCategories(books), voters: getVoters(books) }), [books]);
  const rows = useMemo(() => applyFilters(books, filters), [books, filters]);
  const counts = useMemo(() => facetCounts(books, filters), [books, filters]);
  const activeCount = countActiveFilters(filters);
  const page = clampPage(filters.pagina, rows.length);

  // Search box: local text, written to the URL (replace) after a short pause.
  const [qInput, setQInput] = useState(filters.q);
  const lastWrittenQ = useRef(filters.q);
  useEffect(() => {
    if (filters.q !== lastWrittenQ.current) {
      lastWrittenQ.current = filters.q;
      setQInput(filters.q);
    }
  }, [filters.q]);

  /**
   * Writes new filters to the URL, going back to page 1 unless `pagina` is given.
   * @param {object} patch - Fields to change.
   * @param {{replace?: boolean}} [opts] - replace: no new history entry.
   */
  const update = useCallback((patch, { replace = false } = {}) => {
    const next = serializeFilters({ ...filters, pagina: 1, ...patch });
    if (!sameParams(next, searchParams)) setSearchParams(next, { replace });
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    if (qInput === filters.q) return undefined;
    const timer = setTimeout(() => {
      lastWrittenQ.current = qInput;
      update({ q: qInput }, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [qInput, filters.q, update]);

  const clearAll = () => {
    setQInput('');
    lastWrittenQ.current = '';
    update({ q: '', cat: [], pag: [], nota: '', socio: '' });
  };
  const clearFilters = () => update({ cat: [], pag: [], nota: '', socio: '' });

  const columns = useMemo(() => {
    const extra = [
      { field: 'orden_lectura', headerName: 'Orden de lectura', type: 'number', hideable: false, sortable: true },
    ];
    if (filters.socio) {
      extra.push({
        field: 'nota_socio',
        headerName: filters.socio,
        flex: 0.8,
        minWidth: 110,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        hideable: false,
        valueGetter: (value, row) => (row.votos || []).find((vote) => vote.nombre === filters.socio)?.voto ?? null,
        valueFormatter: (value) => (value === null ? '—' : `${filters.socio}: ${formatNumber(value)}`),
      });
    }
    return [...baseColumns, ...extra];
  }, [filters.socio]);

  const visibility = useMemo(
    () => ({ ...columnVisibilityModel, orden_lectura: false, nota_socio: Boolean(filters.socio) }),
    [columnVisibilityModel, filters.socio]
  );

  /**
   * Updates the visible columns and remembers the choice in this browser.
   * @param {Record<string, boolean>} model - New visibility model.
   */
  const handleColumnVisibilityChange = (model) => {
    const clean = {};
    USER_FIELDS.forEach((field) => { if (typeof model[field] === 'boolean') clean[field] = model[field]; });
    setColumnVisibilityModel(clean);
    saveColumnVisibility(clean);
  };

  const sortModel = useMemo(() => {
    const field = SORT_OPTIONS.find((option) => option.id === filters.orden)?.field;
    return [{ field, sort: filters.dir }];
  }, [filters.orden, filters.dir]);

  const handleSortModelChange = (model) => {
    const item = model[0];
    const orden = item ? sortIdForField(item.field) : DEFAULT_SORT;
    if (!orden) return;
    const dir = item ? item.sort : SORT_OPTIONS.find((option) => option.id === DEFAULT_SORT).dir;
    if (orden === filters.orden && dir === filters.dir) return;
    update({ orden, dir });
  };

  const handlePaginationChange = (model) => {
    if (model.page + 1 !== page) update({ pagina: model.page + 1 });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    filterButtonRef.current?.focus();
  };

  if (!dataBooks || dataBooks.length === 0) {
    return <NoService />;
  }

  const activeChips = [
    ...filters.cat.map((c) => ({ key: `cat-${c}`, label: c, remove: () => update({ cat: filters.cat.filter((x) => x !== c) }) })),
    ...filters.pag.map((id) => ({
      key: `pag-${id}`,
      label: PAGE_RANGES.find((r) => r.id === id).short,
      remove: () => update({ pag: filters.pag.filter((x) => x !== id) }),
    })),
    ...(filters.nota ? [{
      key: 'nota',
      label: RATING_OPTIONS.find((o) => o.id === filters.nota).short,
      remove: () => update({ nota: '' }),
    }] : []),
    ...(filters.socio ? [{ key: 'socio', label: `Valorado por ${filters.socio}`, remove: () => update({ socio: '' }) }] : []),
  ];
  const hasAnything = activeChips.length > 0 || filters.q.trim() !== '';

  const searchField = (
    <TextField
      size="small"
      type="search"
      value={qInput}
      onChange={(event) => setQInput(event.target.value)}
      placeholder="Buscar por título, autor/a o categoría"
      fullWidth
      inputProps={{ 'aria-label': 'Buscar libros' }}
      InputProps={{ startAdornment: <InputAdornment position="start">🔍</InputAdornment> }}
      sx={{ maxWidth: { sm: 420 } }}
    />
  );

  return (
    <div className="content-center-straight">
      <h1 className="page-title">Lista de libros</h1>

      <div className="mb-3 flex w-full flex-col gap-3">
        {isMobile ? (
          <>
            {searchField}
            <div className="flex items-center gap-2">
              <Button ref={filterButtonRef} variant="outlined" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
                {activeCount ? `Filtros (${activeCount})` : 'Filtros'}
              </Button>
              <TextField
                select
                size="small"
                value={filters.orden}
                onChange={(event) => update({
                  orden: event.target.value,
                  dir: SORT_OPTIONS.find((option) => option.id === event.target.value).dir,
                })}
                inputProps={{ 'aria-label': 'Ordenar por' }}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {SORT_OPTIONS.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </TextField>
            </div>
            <Drawer
              anchor="bottom"
              open={drawerOpen}
              onClose={closeDrawer}
              PaperProps={{ sx: { maxHeight: '85vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
            >
              <div className="overflow-y-auto px-4 pt-4" aria-label="Filtros">
                <h2 className="mb-3 text-lg font-bold text-ink">Filtros</h2>
                <BookFilters filters={filters} counts={counts} options={options} onChange={update} idPrefix="m-filtros" />
              </div>
              <div className="sticky bottom-0 mt-3 flex gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <Button variant="outlined" onClick={clearFilters} disabled={activeCount === 0}>Limpiar</Button>
                <Button variant="contained" fullWidth onClick={closeDrawer}>
                  {`Ver ${rows.length} ${rows.length === 1 ? 'libro' : 'libros'}`}
                </Button>
              </div>
            </Drawer>
          </>
        ) : (
          <>
            {searchField}
            <BookFilters filters={filters} counts={counts} options={options} onChange={update} idPrefix="filtros" />
          </>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-sm text-ink" aria-live="polite">
            {`${rows.length} de ${books.length} libros`}
          </p>
          {activeChips.map((chip) => (
            <Chip key={chip.key} size="small" color="primary" variant="outlined" label={chip.label} onDelete={chip.remove} />
          ))}
          {hasAnything && <Button size="small" onClick={clearAll}>Limpiar todo</Button>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="mb-3 text-ink">Ningún libro cumple estos filtros</p>
          <Button variant="contained" onClick={clearAll}>Limpiar filtros</Button>
        </div>
      ) : (
        <DataGrid
          className="shadow-sm"
          autoHeight
          rowHeight={150}
          rows={rows}
          columns={columns}
          columnVisibilityModel={visibility}
          onColumnVisibilityModelChange={handleColumnVisibilityChange}
          disableColumnFilter
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: false } }}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          sortModel={sortModel}
          onSortModelChange={handleSortModelChange}
          sortingOrder={['asc', 'desc']}
          paginationModel={{ page: page - 1, pageSize: PAGE_SIZE }}
          onPaginationModelChange={handlePaginationChange}
          pageSizeOptions={[PAGE_SIZE]}
        />
      )}
    </div>
  );
};

export default BookList;
