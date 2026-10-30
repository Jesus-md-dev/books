import { useBooks } from '../data/BooksContext';
import { computeMemberStats } from '../utils/bookStats';
import NoService from '../component/noService';
import BookCover from '../component/BookCover';

/**
 * Members page showing per-member voting stats.
 * @returns {JSX.Element}
 */
const Members = () => {
  const dataBooks = useBooks();
  if (!dataBooks || dataBooks.length === 0) {
    return <NoService />;
  }

  const members = computeMemberStats(dataBooks);

  return (
    <div className="content-center-straight">
      <h1 className="page-title">Socios y socias</h1>
      <ul className="mx-auto mb-10 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((m) => (
          <li key={m.nombre} className="card flex flex-col items-center text-center">
            <h2 className="mb-1 text-xl">{m.nombre}</h2>
            <p className="text-muted">
              {m.nLibros} libro{m.nLibros === 1 ? '' : 's'} valorado{m.nLibros === 1 ? '' : 's'}
            </p>
            <p className="mt-1 font-semibold">Media dada: {m.media.toFixed(2)} <span aria-hidden="true">★</span></p>
            {m.favorito && (
              <div className="mt-4 flex flex-col items-center border-t border-line pt-4">
                <p className="text-muted-sm mb-2 font-semibold uppercase tracking-wide">Favorito</p>
                <BookCover
                  book={m.favorito}
                  size="sm"
                  caption={<>{m.favorito.titulo} ({m.favorito.voto} <span aria-hidden="true">★</span>)</>}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Members;
