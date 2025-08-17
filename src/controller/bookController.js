
/**
 * Placeholder image for books without a cover.
 * @constant {string}
 */
const placeholderCover = 'https://i.pinimg.com/736x/e0/e9/78/e0e978256054db86ff9690df51d6cd8d.jpg';


/**
 * Fetch book data from Google Books API by title.
 * @param {string} title - Book title to search for.
 * @param {number} [startIndex=0] - Pagination start index.
 * @returns {Promise<Object|undefined>} Google Books API response or undefined on error.
 */
export async function fetchGoogleData(title, startIndex = 0) {
  const MAX_RESULTS = 10;
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&startIndex=${startIndex * MAX_RESULTS}&maxResults=${MAX_RESULTS}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching book data:', error);
    return undefined;
  }
}


/**
 * Process raw data into a grid of book objects.
 * @param {Array} data - Raw data array.
 * @param {boolean} loading - Loading state.
 * @param {boolean} error - Error state.
 * @param {Array} dataBooks - Existing books data.
 * @returns {Promise<Array>} Processed books array or empty array.
 */
export async function fetchData(data, loading, error, dataBooks) {
  const books = {};
  let gridBooks = [];
  if (!loading && !error && data && data[0] && data[0].data) {
    const booksData = data[0].data;
    booksData.forEach(element => {
      const username = element[''];
      const keys = Object.keys(element);
      keys.forEach(key => {
        let value = element[key];
        value = parseFloat(value.replace(',', '.'));
        if (key !== '' && !isNaN(value) && value !== '' && value !== undefined) {
          if (!books[key]) {
            books[key] = { votos: {} };
          }
          if (!books[key].n_votos) {
            books[key].n_votos = 0;
          }
          if (!books[key].sum_votos) {
            books[key].sum_votos = 0;
          }
          if (!books[key].titulo) {
            books[key].titulo = key;
          }
          books[key].votos[username] = value;
          books[key].n_votos += 1;
          books[key].sum_votos += value;
        }
      });
    });
    let id = 0;
    gridBooks = Object.keys(books)
      .sort()
      .map(key => {
        const votos = Object.entries(books[key].votos);
        return {
          id: id++,
          titulo: books[key].titulo,
          n_votos: books[key].n_votos,
          sum_votos: books[key].sum_votos,
          media: (books[key].sum_votos / books[key].n_votos).toFixed(2),
          votos: votos.map(([nombre, voto]) => ({ nombre, voto })),
          imagen: placeholderCover,
          autor: 'Desconocido',
          editorial: 'Desconocida',
          fecha_publicacion: '-',
          descripcion: '',
          n_paginas: 0,
          categorias: [],
          volumeInfo: []
        };
      });
    if (gridBooks.length !== dataBooks.length) {
      return gridBooks;
    }
    return [];
  }
  return [];
}


/**
 * Enrich book data with Google Books API info if missing author or image.
 * @param {Array} data - Raw data array.
 * @param {boolean} loading - Loading state.
 * @param {boolean} error - Error state.
 * @param {Array} dataBooks - Existing books data.
 * @returns {Promise<Array>} Enriched books array.
 */
export async function getGoogleData(data, loading, error, dataBooks) {
  let gridBooks = await fetchData(data, loading, error, dataBooks);
  if (gridBooks) {
    if (gridBooks.length === 0) {
      gridBooks = dataBooks;
    }
    for (const book of gridBooks) {
      if (book.autor === 'Desconocido' || book.imagen === placeholderCover) {
        const fetchedOLData = await fetchGoogleData(book.titulo);
        const secondFetchedOLData = await fetchGoogleData(`${book.titulo}.*`);
        if (fetchedOLData && fetchedOLData.items && fetchedOLData.items.length > 0) {
          fetchedOLData.items.forEach(item => {
            if (
              item.volumeInfo.title === book.titulo &&
              (book.autor === 'Desconocido' || book.imagen === placeholderCover)
            ) {
              if (book.autor === 'Desconocido') {
                book.autor = item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Desconocido';
              }
              if (book.imagen === placeholderCover) {
                book.imagen = item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : placeholderCover;
              }
              if (book.volumeInfo.length === 0) {
                book.volumeInfo = item.volumeInfo;
              }
            }
          });
        }
        if (secondFetchedOLData && secondFetchedOLData.items && secondFetchedOLData.items.length > 0) {
          secondFetchedOLData.items.forEach(item => {
            if (
              item.volumeInfo.title === book.titulo &&
              (book.autor === 'Desconocido' || book.imagen === placeholderCover)
            ) {
              if (book.autor === 'Desconocido') {
                book.autor = item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Desconocido';
              }
              if (book.imagen === placeholderCover) {
                book.imagen = item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : placeholderCover;
              }
              if (book.volumeInfo.length === 0) {
                book.volumeInfo = item.volumeInfo;
              }
            }
          });
        }
        if (secondFetchedOLData && secondFetchedOLData.items && secondFetchedOLData.items.length > 0) {
          if (book.autor === 'Desconocido' || book.imagen === placeholderCover) {
            const firstResult = secondFetchedOLData.items[0];
            book.autor = firstResult.volumeInfo.authors ? firstResult.volumeInfo.authors.join(', ') : 'Desconocido';
            book.imagen = firstResult.volumeInfo.imageLinks ? firstResult.volumeInfo.imageLinks.thumbnail : placeholderCover;
            book.volumeInfo = firstResult.volumeInfo;
          }
        }
        if (fetchedOLData && fetchedOLData.items && fetchedOLData.items.length > 0) {
          if (book.autor === 'Desconocido' || book.imagen === placeholderCover) {
            const firstResult = fetchedOLData.items[0];
            book.autor = firstResult.volumeInfo.authors ? firstResult.volumeInfo.authors.join(', ') : 'Desconocido';
            book.imagen = firstResult.volumeInfo.imageLinks ? firstResult.volumeInfo.imageLinks.thumbnail : placeholderCover;
            book.volumeInfo = firstResult.volumeInfo;
          }
        }
      }
    }
    localStorage.setItem('dataBooks', JSON.stringify(gridBooks));
  }
  return gridBooks;
}
