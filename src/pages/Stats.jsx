import { useBooks } from '../data/BooksContext';
import { computeClubStats } from '../utils/bookStats';
import NoService from '../component/noService';
import BookCover from '../component/BookCover';

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

  const highlights = [
    stats.mejorValorado && { id: 'mejor', title: 'Mejor valorado', book: stats.mejorValorado },
    stats.peorValorado && stats.peorValorado.titulo !== stats.mejorValorado?.titulo &&
      { id: 'peor', title: 'Peor valorado', book: stats.peorValorado },
  ].filter(Boolean);

  return (
    <div className="content-center-straight">
      <h1 className="page-title">Estadísticas del club</h1>

      <dl className="section mx-auto grid max-w-6xl grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card flex flex-col-reverse justify-center text-center">
            <dt className="text-muted-sm mt-1">{c.label}</dt>
            <dd className="break-words font-display text-2xl font-bold sm:text-3xl">{c.value}</dd>
          </div>
        ))}
      </dl>

      {stats.categorias.length > 0 && (
        <section className="section mx-auto max-w-3xl text-center" aria-labelledby="category-breakdown-title">
          <h2 id="category-breakdown-title" className="mb-2">Libros por categoría</h2>
          <p className="text-muted-sm mb-4">
            {stats.librosConCategoria} de {stats.totalLibros} libros tienen categoría.
          </p>
          <ul className="flex flex-wrap justify-center gap-3">
            {stats.categorias.map(({ nombre, count }) => (
              <li key={nombre} className="chip">
                <span className="font-semibold">{nombre}</span>{' '}
                <span aria-label={`${count} libros`}>({count})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {highlights.length > 0 && (
        <div className="section mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          {highlights.map(({ id, title, book }) => (
            <section key={id} className="card flex flex-col items-center text-center" aria-labelledby={`${id}-title`}>
              <h2 id={`${id}-title`} className="mb-4 text-xl">{title}</h2>
              <BookCover book={book} size="lg" />
              <p className="mt-3 font-bold">{book.titulo}</p>
              <p>{book.media} <span aria-hidden="true">★</span></p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Stats;
