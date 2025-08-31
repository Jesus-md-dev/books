import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Loading from '../component/loading';
import NoService  from '../component/noService';
import { TextField } from '@mui/material';
import useGoogleSheets from 'use-google-sheets';
import { useBooksController } from '../controller/useBooksController';


/**
 * AdminPage component displaying books in a data grid and allowing DB update.
 * Refactored for readability and maintainability.
 * @returns {JSX.Element}
 */
const AdminPage = () => {
  // State for books data
  const [dataBooks, setDataBooks] = useState([]);

  // Fetch book data from Google Sheets (Libros)
  const LibrosData = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
    sheetsOptions: [{ id: 'Libros' }],
  });

  // Fetch actual book data from Google Sheets (Actual)
  const ActualBookData = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_DATA_SHEET_ID,
    sheetsOptions: [{ id: 'Actual' }],
  });


  // Effect to load cached books from localStorage
  useEffect(() => {
    /**
     * Loads books from localStorage cache, waits if not available.
     */
    async function fetchBooksFromCache() {
      let cachedBooks = localStorage.getItem('dataBooks');
      // Wait until books are available in cache
      while (!cachedBooks || cachedBooks.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('No books found, checking cache...');
        cachedBooks = localStorage.getItem('dataBooks');
      }
      // Set state if not already set
      if (cachedBooks && dataBooks.length === 0) {
        setDataBooks(JSON.parse(cachedBooks));
      }
    }
    fetchBooksFromCache();
  }, [dataBooks.length]);

  // Custom hook to sync Google Sheets data with local state
  useBooksController(LibrosData['data'], LibrosData['loading'], LibrosData['error'], ActualBookData['data']);

  // Show loading spinner if data is loading and no books are present
  if (ActualBookData['loading'] && dataBooks && dataBooks.length === 0) {
    return <Loading />;
  }

  // Show error component if there is an error and no books are present
  if (ActualBookData['error'] && !dataBooks) {
    return <NoService />;
  }



  /**
   * Handles form submission to update the DB via a script URL.
   * @param {Event} event - Form submit event
   */
  function handleSubmit(event) {
    event.preventDefault();
    const scriptUrl = getScriptUrlFromForm(event);

    if (!scriptUrl) {
      console.log('Script URL is required');
      return;
    }

    postBooksToScript(scriptUrl, dataBooks);
  }

  /**
   * Extracts the script URL from the form event.
   * @param {Event} event
   * @returns {string}
   */
  function getScriptUrlFromForm(event) {
    return event.currentTarget.elements.scriptUrl.value;
  }

  /**
   * Posts the books data to the provided script URL.
   * @param {string} scriptUrl
   * @param {Array} books
   */
  function postBooksToScript(scriptUrl, books) {
    fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(books),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        console.log(data);
      })
      .catch(err => {
        console.error('There was a problem with the fetch operation:', err);
        console.log(err);
      });
  }

  /**
   * Renders the update DB form.
   */
  function renderUpdateForm() {
    return (
      <div className='w-1/2 bg-white p-4 rounded shadow'>
        <form onSubmit={handleSubmit} className='text-center'>
          <h1>Update DB</h1>
          <p>Provide the script URL.</p>
          <TextField
            label="Script URL"
            variant="outlined"
            name='scriptUrl'
            margin='normal'
            fullWidth
          />
          <Button 
            variant="contained" 
            type='submit'
          >
            Submit
          </Button>
        </form>
      </div>
    );
  }

  // Main render
  return (
    <div className='content-center-straight'>
      {renderUpdateForm()}
    </div>
  );
};

export default AdminPage;