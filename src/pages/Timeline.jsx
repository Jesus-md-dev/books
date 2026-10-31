import { Link } from 'react-router-dom';
import { useBooks } from '../data/BooksContext';
import NoService from '../component/noService';
import BookCover from '../component/BookCover';
import { bookPath } from '../utils/bookPath';
import { computeMilestones, timelineOrder } from '../utils/timeline';

const fmt = (n) => n.toLocaleString('es-ES');

/**
 * Vertical reading timeline of the club, most recent book first. There is no
 * reading date in the data: the books order is the reading order.
 * @returns {JSX.Element}
 */
const Timeline = () => {
  const dataBooks = useBooks();
  if (!dataBooks || dataBooks.length === 0) {
    return <NoService />;
  }

  const m = computeMilestones(dataBooks);
  const ordered = timelineOrder(dataBooks);
  const total = ordered.length;

  const cards = [
    { label: 'Libros leídos', value: fmt(m.totalLibros) },
    m.totalPaginas > 0 && { label: 'Páginas leídas', value: fmt(m.totalPaginas) },
    m.mejorValorado && {
      label: 'Mejor valorado',
      value: m.mejorValorado.titulo,
      sub: `${m.mejorValorado.media} ★`,
      book: m.mejorValorado,
    },
    m.masPaginas && {
      label: 'Libro más largo',
      value: m.masPaginas.titulo,
      sub: `${fmt(Number(m.masPaginas.n_paginas))} páginas`,
      book: m.masPaginas,
    },
  ].filter(Boolean);

  return (
    <div className="content-center-straight">
      <h1 className="page-title">Línea temporal del club</h1>

      <dl className="section mx-auto grid max-w-4xl grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex min-w-0 flex-col-reverse justify-center text-center">
            <dt className="text-muted-sm mt-1">{c.label}</dt>
            <dd className="break-words font-display text-xl font-bold sm:text-2xl">
              {c.book ? <Link to={bookPath(c.book.titulo)}>{c.value}</Link> : c.value}
              {c.sub && <span className="text-muted-sm block font-sans font-normal">{c.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <ol className="section mx-auto max-w-2xl border-l-2 border-line pl-5 sm:pl-8">
        {ordered.map((book, i) => {
          const rated = book.n_votos > 0;
          const pages = Number(book.n_paginas);
          return (
            <li key={`${book.titulo}-${i}`} className="relative mb-6 last:mb-0">
              <span
                aria-hidden="true"
                className="absolute -left-[1.6rem] top-4 h-3 w-3 rounded-full border-2 border-line bg-surface sm:-left-[2.1rem]"
              />
              <Link
                to={bookPath(book.titulo)}
                className="card flex min-w-0 items-center gap-4 no-underline"
              >
                <BookCover book={book} size="sm" />
                <span className="min-w-0">
                  <span className="text-muted-sm block">
                    {i === 0 ? 'Última lectura' : `Lectura n.º ${total - i}`}
                  </span>
                  <span className="block break-words font-bold">{book.titulo}</span>
                  {book.autor && book.autor !== 'Desconocido' && (
                    <span className="text-muted-sm block break-words">{book.autor}</span>
                  )}
                  <span className="text-muted-sm block">
                    {rated ? `${book.media} ★` : 'Sin valoraciones'}
                    {pages > 0 && ` · ${fmt(pages)} págs.`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Timeline;
