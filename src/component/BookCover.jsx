import { Link } from 'react-router-dom';
import { bookPath } from '../utils/bookPath';

/**
 * Book cover linking to the book's page, with an optional caption.
 * @param {{ book: { titulo: string, imagen?: string }, caption?: React.ReactNode,
 *   size?: 'sm' | 'md' | 'lg', eager?: boolean, className?: string }} props
 * @returns {JSX.Element}
 */
const SIZES = {
  sm: { className: 'h-32 w-auto', width: 88, height: 128 },
  md: { className: 'h-48 w-auto sm:h-56', width: 150, height: 224 },
  lg: { className: 'h-60 w-auto sm:h-72', width: 196, height: 288 },
};

// Full-size Google covers (zoom=0) weigh ~450 KB: ask Google for a resized copy
// (fife=wN) so lists stay light; other hosts are used as they are. A URL carrying `nofife`
// is used as it is: for some scanned volumes fife returns a different page than the cover.
const isGoogleCover = (url) => /^https:\/\/books\.google\.[a-z.]+\/books\/content\?/.test(url || '')
  && !/[?&]nofife/.test(url);
const resized = (url, width) => `${url}&fife=w${width}`;

const BookCover = ({ book, caption, size = 'md', eager = false, className = '' }) => {
  const s = SIZES[size];
  const google = isGoogleCover(book.imagen);
  return (
    <Link to={bookPath(book.titulo)} className={`cover-link group ${className}`}>
      <img
        className={`cover-img object-contain ${s.className}`}
        src={google ? resized(book.imagen, s.width * 2) : book.imagen}
        srcSet={google ? `${resized(book.imagen, s.width * 2)} 2x, ${resized(book.imagen, s.width * 3)} 3x` : undefined}
        alt={`Portada de ${book.titulo}`}
        width={s.width}
        height={s.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      {caption && <span className="cover-caption">{caption}</span>}
    </Link>
  );
};

export default BookCover;
