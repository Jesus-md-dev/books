import Grid from '@mui/material/Grid2';
import { useBooks } from '../data/BooksContext';
import { computeClubStats } from '../utils/bookStats';
import NoService from '../component/noService';

/**
 * Stats page showing club-wide reading statistics.
 * @returns {JSX.Element}
 */
const Stats = () => {
  const dataBooks = useBooks();
  if (!dataBooks || dataBooks.length === 0) {
    return <NoService />;
  }

  const stats = computeClubStats(dataBooks);

  const cards = [
    { label: 'Libros en la bitácora', value: stats.totalLibros },
    { label: 'Libros valorados', value: stats.librosValorados },
    { label: 'Media general del club', value: stats.mediaGeneral.toFixed(2) },
    stats.categoriaTop && {
      label: 'Categoría más repetida',
      value: `${stats.categoriaTop.nombre} (${stats.categoriaTop.count})`,
    },
    stats.socioMasActivo && {
      label: 'Socio/a más activo/a',
      value: `${stats.socioMasActivo.nombre} (${stats.socioMasActivo.count} votos)`,
    },
  ].filter(Boolean);

  return (
    <div className="content-center-straight">
      <h1 className="text-center my-5">Estadísticas del club</h1>

      <Grid container spacing={3} className="justify-center mb-10">
        {cards.map((c) => (
          <Grid key={c.label} size="auto">
            <div className="bg-white rounded-xl shadow p-5 text-center w-52">
              <div className="text-3xl font-bold">{c.value}</div>
              <div className="text-sm text-gray-600 mt-1">{c.label}</div>
            </div>
          </Grid>
        ))}
      </Grid>

      {stats.categorias.length > 0 && (
        <section className="mx-auto mb-10 max-w-3xl px-4 text-center" aria-labelledby="category-breakdown-title">
          <h2 id="category-breakdown-title" className="mb-2 text-xl font-bold">Libros por categorÃ­a</h2>
          <p className="mb-4 text-sm text-gray-600">
            {stats.librosConCategoria} de {stats.totalLibros} libros tienen categorÃ­a.
          </p>
          <ul className="flex flex-wrap justify-center gap-3">
            {stats.categorias.map(({ nombre, count }) => (
              <li key={nombre} className="rounded-full bg-white px-4 py-2 shadow">
                <span className="font-semibold">{nombre}</span>{' '}
                <span aria-label={`${count} libros`}>({count})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Grid container spacing={6} className="justify-center mb-10">
        {stats.mejorValorado && (
          <Grid size="auto" className="text-center text-black">
            <h3 className="mb-2">Mejor valorado</h3>
            <a href={'/libro/' + stats.mejorValorado.titulo}>
              <img
                className="my-1 border-4 border-slate-950 h-60 mx-auto"
                src={stats.mejorValorado.imagen}
                alt={stats.mejorValorado.titulo}
              />
            </a>
            <p className="mt-2 font-bold">{stats.mejorValorado.titulo}</p>
            <p>{stats.mejorValorado.media} ★</p>
          </Grid>
        )}
        {stats.peorValorado && stats.peorValorado.titulo !== stats.mejorValorado?.titulo && (
          <Grid size="auto" className="text-center text-black">
            <h3 className="mb-2">Peor valorado</h3>
            <a href={'/libro/' + stats.peorValorado.titulo}>
              <img
                className="my-1 border-4 border-slate-950 h-60 mx-auto"
                src={stats.peorValorado.imagen}
                alt={stats.peorValorado.titulo}
              />
            </a>
            <p className="mt-2 font-bold">{stats.peorValorado.titulo}</p>
            <p>{stats.peorValorado.media} ★</p>
          </Grid>
        )}
      </Grid>
    </div>
  );
};

export default Stats;
