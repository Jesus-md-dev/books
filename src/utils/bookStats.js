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

  const categoryCounts = {};
  books.forEach((b) => {
    (b.categorias || []).forEach((cat) => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });
  const categoriaTop = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

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
    categoriaTop: categoriaTop ? { nombre: categoriaTop[0], count: categoriaTop[1] } : null,
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
