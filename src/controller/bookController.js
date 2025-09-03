
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
    return await response;
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
export async function fetchData(data, loading, error, dataActual, dataBooks) {
  const books = {};
  let gridBooks = [];
  let rawGridBooks = [];
  let order = [];
  if (!loading && !error && data && data[0] && data[0].data && dataActual && dataActual[0] && dataActual[0].data) {
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
    rawGridBooks = Object.keys(books)
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
    data[0]['data'].forEach(element => {
      if (Object.keys(element).length-1 === rawGridBooks.length) {
        order = Object.keys(element).slice(1);
      } 
    });
    order.push(dataActual[0].data[0].actual);
    id = 0;
    order.forEach(element => {
      let book = rawGridBooks.find(b => b.titulo === element);
      if (book) {
        book['id'] = id;
        gridBooks.push(book);
      }
      else {
        book = { id, titulo: element, n_votos: 0, sum_votos: 0, media: 0, votos: [], imagen: placeholderCover, autor: 'Desconocido', editorial: 'Desconocida', fecha_publicacion: '-', descripcion: '', n_paginas: 0, categorias: [], volumeInfo: [] };
        gridBooks.push(book);
      }
      id++;
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
export async function getGoogleData(data, loading, error, dataActual, dataBooks) {
    let gridBooks = await fetchData(data, loading, error, dataActual, dataBooks);
    if (gridBooks) {
        if (gridBooks.length === 0) {
            gridBooks = dataBooks;
        }
        else {
          localStorage.setItem('dataBooks', JSON.stringify(gridBooks));
        }

        function updateBookFromItem(book, item) {
            if (book.autor === 'Desconocido' && item.volumeInfo.authors) {
                book.autor = item.volumeInfo.authors.join(', ');
            }
            if (book.imagen === placeholderCover && item.volumeInfo.imageLinks) {
                book.imagen = item.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
            }
            if (book.editorial === 'Desconocida' && item.volumeInfo.publisher) {
                book.editorial = item.volumeInfo.publisher;
            }
            if (book.fecha_publicacion === '-' && item.volumeInfo.publishedDate) {
                book.fecha_publicacion = item.volumeInfo.publishedDate;
            }
            if (book.descripcion === '' && item.volumeInfo.description) {
                book.descripcion = item.volumeInfo.description;
            }
            if (book.n_paginas === 0 && item.volumeInfo.pageCount) {
                book.n_paginas = item.volumeInfo.pageCount;
            }
            if (book.categorias.length === 0 && item.volumeInfo.categories) {
                book.categorias = item.volumeInfo.categories;
            }
            if (book.volumeInfo.length === 0 && item.volumeInfo) {
                book.volumeInfo = item.volumeInfo;
            }
        }

        for (const book of gridBooks) {
            if (book.imagen === placeholderCover) {
                const queries = [book.titulo + '.*', book.titulo];
                
                for (const query of queries) {
                    const response = await fetchGoogleData(query);
                    let fetchedData;
                    if (response) {
                      fetchedData = await response.json();
                    }
                    else {
                      await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                    if (fetchedData && fetchedData.items && fetchedData.items.length > 0) {
                        // Try to find an exact title match first
                        let matched = false;
                        for (const item of fetchedData.items) {
                            if (item.volumeInfo.title === book.titulo) {
                                updateBookFromItem(book, item);
                                matched = true;
                            }
                        }
                        // If still missing info, use the first result
                        if ((book.autor === 'Desconocido' || book.imagen === placeholderCover) && !matched) {
                            updateBookFromItem(book, fetchedData.items[0]);
                        }
                        // If both fields are filled, break early
                        if (book.autor !== 'Desconocido' && book.imagen !== placeholderCover) {
                            break;
                        }
                    }
                }
            }
        }
        localStorage.setItem('dataBooks', JSON.stringify(gridBooks));
    }
    return gridBooks;
}
