
/**
 * Placeholder image for books without a cover.
 * Using a smaller, optimized placeholder image
 * @constant {string}
 */
const placeholderCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="196" viewBox="0 0 128 196"%3E%3Crect width="128" height="196" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%23fff" text-anchor="middle" dominant-baseline="middle"%3ESin portada%3C/text%3E%3C/svg%3E';

// Simple in-memory cache for Google Books API responses
const apiCache = new Map();
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour


/**
 * Fetch book data from Google Books API by title.
 * @param {string} title - Book title to search for.
 * @param {number} [startIndex=0] - Pagination start index.
 * @returns {Promise<Object|undefined>} Google Books API response or undefined on error.
 */
export async function fetchGoogleData(title, startIndex = 0) {
  const MAX_RESULTS = 10;
  const cacheKey = `${title}-${startIndex}`;
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY)) {
    return Promise.resolve({ json: () => Promise.resolve(cached.data) });
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&startIndex=${startIndex * MAX_RESULTS}&maxResults=${MAX_RESULTS}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Cache the parsed response
    const data = await response.json();
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return { json: () => Promise.resolve(data) };
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
 * Optimized to reduce main-thread blocking by batching requests and using setTimeout
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
                // Request smaller image and convert to HTTPS
                let imageUrl = item.volumeInfo.imageLinks.thumbnail || item.volumeInfo.imageLinks.smallThumbnail;
                if (imageUrl) {
                    // Replace zoom parameter to get smaller images (zoom=1 is smallest)
                    imageUrl = imageUrl.replace('http://', 'https://').replace(/zoom=\d+/, 'zoom=1');
                    book.imagen = imageUrl;
                }
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

        // Process books with missing images in chunks to avoid blocking main thread
        const booksNeedingData = gridBooks.filter(book => book.imagen === placeholderCover);
        
        // Only fetch for first 10 books to reduce API calls and main-thread work
        const limitedBooks = booksNeedingData.slice(0, 10);
        const CHUNK_SIZE = 2; // Process 2 books at a time (reduced from 3)
        
        for (let i = 0; i < limitedBooks.length; i += CHUNK_SIZE) {
            const chunk = limitedBooks.slice(i, i + CHUNK_SIZE);
            
            // Process chunk in parallel
            await Promise.all(chunk.map(async (book) => {
                const queries = [book.titulo + '.*', book.titulo];
                
                for (const query of queries) {
                    const response = await fetchGoogleData(query);
                    let fetchedData;
                    if (response) {
                      fetchedData = await response.json();
                    }
                    else {
                      // Reduced wait time from 60s to 5s to avoid long blocking
                      await new Promise(resolve => setTimeout(resolve, 5000));
                      continue;
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
            }));
            
            // Yield to main thread between chunks
            if (i + CHUNK_SIZE < limitedBooks.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        localStorage.setItem('dataBooks', JSON.stringify(gridBooks));
    }
    return gridBooks;
}
