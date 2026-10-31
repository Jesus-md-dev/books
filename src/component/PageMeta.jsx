import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBooks } from '../data/BooksContext';

export const SITE_URL = 'https://bahia-lectora.jzmarquez.com';
const SITE = 'Bahía Lectora';

const PAGES = {
  '/': { title: SITE, description: 'Bahía Lectora - club de lectura' },
  '/libros': { title: `Libros · ${SITE}`, description: 'Todos los libros leídos por el club de lectura Bahía Lectora, con sus valoraciones.' },
  '/sorteo': { title: `Sorteo · ${SITE}`, description: 'Sorteo del próximo libro del club de lectura Bahía Lectora.', noindex: true },
  '/estadisticas': { title: `Estadísticas · ${SITE}`, description: 'Estadísticas del club de lectura Bahía Lectora: libros mejor y peor valorados y más.' },
  '/linea-temporal': { title: `Línea temporal · ${SITE}`, description: 'Todas las lecturas del club de lectura Bahía Lectora en orden, con sus hitos: libros, páginas y mejor valorado.' },
  '/socios': { title: `Socios · ${SITE}`, description: 'Las socias y socios del club de lectura Bahía Lectora y sus libros favoritos.' },
};

const norm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

function upsert(tag, attr, key, value, content) {
  let el = document.head.querySelector(`${tag}[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(content, value);
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Sets title, description, canonical and robots for the current route. Renders nothing. */
export default function PageMeta() {
  const { pathname } = useLocation();
  const books = useBooks();

  useEffect(() => {
    const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    let page = PAGES[clean];
    let canonicalPath = page ? clean : '/';
    if (!page && clean.startsWith('/libro/')) {
      const id = safeDecode(clean.slice('/libro/'.length));
      const book = (books || []).find((b) => norm(b.titulo) === norm(id));
      if (book) {
        const t = String(book.titulo).trim().replace(/\s+/g, ' ');
        const text = String(book.descripcion || '').replace(/\s+/g, ' ').trim();
        page = {
          title: `${t} · ${SITE}`,
          description: text
            ? (text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text)
            : `${t}: ficha y valoraciones del club de lectura ${SITE}.`,
        };
        canonicalPath = `/libro/${encodeURIComponent(t)}`;
      }
    }
    page = page || PAGES['/'];
    const url = SITE_URL + canonicalPath;
    document.title = page.title;
    upsert('meta', 'name', 'description', page.description, 'content');
    upsert('link', 'rel', 'canonical', url, 'href');
    upsert('meta', 'property', 'og:url', url, 'content');
    upsert('meta', 'property', 'og:title', page.title, 'content');
    upsert('meta', 'property', 'og:description', page.description, 'content');
    upsert('meta', 'name', 'robots', page.noindex ? 'noindex' : 'index,follow', 'content');
  }, [pathname, books]);

  return null;
}
