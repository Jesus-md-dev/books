import Grid from '@mui/material/Grid2';
import { useBooks } from '../data/BooksContext';
import { computeMemberStats } from '../utils/bookStats';
import NoService from '../component/noService';

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
      <h1 className="text-center my-5">Socios y socias</h1>
      <Grid container spacing={4} className="justify-center mb-10">
        {members.map((m) => (
          <Grid key={m.nombre} size="auto">
            <div className="bg-white rounded-xl shadow p-5 text-center w-60 text-black">
              <h3 className="mb-2">{m.nombre}</h3>
              <p>{m.nLibros} libro{m.nLibros === 1 ? '' : 's'} valorado{m.nLibros === 1 ? '' : 's'}</p>
              <p>Media dada: {m.media.toFixed(2)} ★</p>
              {m.favorito && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Favorito</p>
                  <a href={'/libro/' + m.favorito.titulo} className="flex justify-center">
                    <img
                      className="my-1 border-4 border-slate-950 h-32"
                      src={m.favorito.imagen}
                      alt={m.favorito.titulo}
                    />
                  </a>
                  <p className="text-sm">{m.favorito.titulo} ({m.favorito.voto} ★)</p>
                </div>
              )}
            </div>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default Members;
