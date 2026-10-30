import { useBooks } from '../data/BooksContext';
import { computeMemberStats, computeMemberAffinity, MIN_SHARED_BOOKS } from '../utils/bookStats';
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
  const affinity = computeMemberAffinity(dataBooks);

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
            {affinity[m.nombre] && (
              <div className="mt-4 w-full border-t border-line pt-4">
                <h3 className="text-muted-sm mb-2 font-semibold uppercase tracking-wide">Gustos en común</h3>
                <p>
                  Coincide más con <strong>{affinity[m.nombre].mas.nombre}</strong>{' '}
                  ({affinity[m.nombre].mas.afinidad}%)
                </p>
                {affinity[m.nombre].menos && (
                  <p className="mt-1">
                    Coincide menos con <strong>{affinity[m.nombre].menos.nombre}</strong>{' '}
                    ({affinity[m.nombre].menos.afinidad}%)
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-muted-sm mx-auto mb-10 max-w-3xl text-center">
        La coincidencia compara las notas de dos socios en los libros que ambos han valorado
        (mínimo {MIN_SHARED_BOOKS}): 100% es votar igual y 0% es votar en extremos opuestos.
        Solo aparece quien comparte suficientes lecturas con otros socios.
      </p>
    </div>
  );
};

export default Members;
