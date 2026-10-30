/**
 * Pure helpers that derive club-wide and per-member statistics from the
 * books data already available in src/data/books.json. No extra data
 * source needed — everything here is computed from votos/media/categorias
 * that the build script already collects.
 */

export function computeClubStats(books) {
  const ratedBooks = books.filter((b) => b.n_votos > 0);

  const allVotes = ratedBooks.flatMap((b) => b.votos.map((v) => Number(v.voto)));
  const mediaGeneral = allVotes.length > 0
    ? allVotes.reduce((sum, v) => sum + v, 0) / allVotes.length
    : 0;

  const categoryCounts = new Map();
  let librosConCategoria = 0;
  books.forEach((b) => {
    const categories = new Map();
    (b.categorias || []).forEach((rawCategory) => {
      if (typeof rawCategory !== 'string' || !rawCategory.trim()) return;
      const category = rawCategory.trim();
      const key = category.toLocaleLowerCase();
      if (!categories.has(key)) categories.set(key, category);
    });
    if (categories.size) librosConCategoria += 1;
    categories.forEach((category, key) => {
      const existing = categoryCounts.get(key);
      categoryCounts.set(key, { nombre: existing?.nombre || category, count: (existing?.count || 0) + 1 });
    });
  });
  const categorias = [...categoryCounts.values()].sort((a, b) => (
    b.count - a.count || a.nombre.localeCompare(b.nombre, 'es')
  ));

  const byMedia = [...ratedBooks].sort((a, b) => parseFloat(b.media) - parseFloat(a.media));
  const mejorValorado = byMedia[0] || null;
  const peorValorado = byMedia[byMedia.length - 1] || null;

  const voteCounts = {};
  ratedBooks.forEach((b) => {
    b.votos.forEach((v) => {
      voteCounts[v.nombre] = (voteCounts[v.nombre] || 0) + 1;
    });
  });
  const socioMasActivo = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    totalLibros: books.length,
    librosValorados: ratedBooks.length,
    mediaGeneral,
    categoriaTop: categorias[0] || null,
    categorias,
    librosConCategoria,
    mejorValorado,
    peorValorado,
    socioMasActivo: socioMasActivo ? { nombre: socioMasActivo[0], count: socioMasActivo[1] } : null,
  };
}

export function computeMemberStats(books) {
  const members = {};
  books.forEach((book) => {
    book.votos.forEach(({ nombre, voto }) => {
      if (!members[nombre]) {
        members[nombre] = { nombre, votos: [] };
      }
      members[nombre].votos.push({ titulo: book.titulo, voto: Number(voto), imagen: book.imagen });
    });
  });

  return Object.values(members)
    .map((m) => {
      const sum = m.votos.reduce((s, v) => s + v.voto, 0);
      const favorito = [...m.votos].sort((a, b) => b.voto - a.voto)[0];
      return {
        nombre: m.nombre,
        nLibros: m.votos.length,
        media: sum / m.votos.length,
        favorito,
      };
    })
    .sort((a, b) => b.nLibros - a.nLibros);
}

/** Valid vote scale of the club (the sheet also holds a few joke/out-of-scale values). */
export const VOTE_MIN = 0.5;
export const VOTE_MAX = 5;
/** Minimum books two members must both have rated to compare them. */
export const MIN_SHARED_BOOKS = 4;
/** Minimum valid votes a book needs to be called divisive. */
export const MIN_VOTES_DIVISIVE = 5;

const isValidVote = (v) => Number.isFinite(v) && v >= VOTE_MIN && v <= VOTE_MAX;

/** Valid votes of a book as a Map name -> vote (out-of-scale values are ignored). */
const validVotes = (book) => {
  const map = new Map();
  (book.votos || []).forEach(({ nombre, voto }) => {
    const v = Number(voto);
    if (nombre && isValidVote(v)) map.set(nombre, v);
  });
  return map;
};

/**
 * Taste affinity between every pair of members: 100 * (1 - mean absolute
 * difference / 4.5) over the books both rated (4.5 = widest possible gap).
 * Pairs with fewer than `minShared` shared books are left out.
 * @returns {Array<{a: string, b: string, shared: number, diff: number, afinidad: number}>}
 */
export function computeAffinities(books, { minShared = MIN_SHARED_BOOKS } = {}) {
  const acc = new Map();
  books.forEach((book) => {
    const entries = [...validVotes(book)];
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const [x, y] = entries[i][0] < entries[j][0] ? [entries[i], entries[j]] : [entries[j], entries[i]];
        const key = `${x[0]}\u0000${y[0]}`;
        const cur = acc.get(key) || { a: x[0], b: y[0], shared: 0, total: 0 };
        cur.shared += 1;
        cur.total += Math.abs(x[1] - y[1]);
        acc.set(key, cur);
      }
    }
  });
  return [...acc.values()]
    .filter((p) => p.shared >= minShared)
    .map(({ a, b, shared, total }) => {
      const diff = total / shared;
      return { a, b, shared, diff, afinidad: Math.round(100 * (1 - diff / (VOTE_MAX - VOTE_MIN))) };
    });
}

/**
 * For each member, who they agree with most and least.
 * `menos` is null when there is only one comparable member.
 * @returns {Object<string, {mas: object, menos: object|null}>}
 */
export function computeMemberAffinity(books, options) {
  const lists = new Map();
  computeAffinities(books, options).forEach((p) => {
    const add = (name, other) => {
      if (!lists.has(name)) lists.set(name, []);
      lists.get(name).push({ nombre: other, shared: p.shared, diff: p.diff, afinidad: p.afinidad });
    };
    add(p.a, p.b);
    add(p.b, p.a);
  });
  const result = {};
  lists.forEach((list, name) => {
    list.sort((x, y) => y.afinidad - x.afinidad || x.diff - y.diff || y.shared - x.shared
      || x.nombre.localeCompare(y.nombre, 'es'));
    result[name] = { mas: list[0], menos: list.length > 1 ? list[list.length - 1] : null };
  });
  return result;
}

/**
 * Book whose valid votes are the most spread out (population standard
 * deviation), among books with at least `minVotes` valid votes.
 * @returns {{book: object, desviacion: number, nVotos: number, min: number, max: number}|null}
 */
export function computeMostDivisive(books, { minVotes = MIN_VOTES_DIVISIVE } = {}) {
  let best = null;
  books.forEach((book) => {
    const votes = [...validVotes(book).values()];
    if (votes.length < minVotes) return;
    const mean = votes.reduce((s, v) => s + v, 0) / votes.length;
    const desviacion = Math.sqrt(votes.reduce((s, v) => s + (v - mean) ** 2, 0) / votes.length);
    if (!best || desviacion > best.desviacion) {
      best = { book, desviacion, nVotos: votes.length, min: Math.min(...votes), max: Math.max(...votes) };
    }
  });
  return best;
}
