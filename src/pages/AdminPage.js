import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Loading from '../component/loading';
import NoService  from '../component/noService';
import { TextField } from '@mui/material';
import useGoogleSheets from 'use-google-sheets';
import { useBooksController } from '../controller/useBooksController';

/**
 * AdminPage component displaying books in a data grid.
 * @returns {JSX.Element}
 */
const AdminPage = () => {
  const [dataBooks, setDataBooks] = useState([]);

  const LibrosData = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
    sheetsOptions: [{ id: 'Libros' }],
  });

  const ActualBookData = useGoogleSheets({
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    sheetId: process.env.REACT_APP_DATA_SHEET_ID,
    sheetsOptions: [{ id: 'Actual' }],
  });

  useEffect(() => {
    const fetchBooks = async () => {
      let cachedBooks = localStorage.getItem('dataBooks');
      while (!cachedBooks || cachedBooks.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('No books found, checking cache...');
        cachedBooks = localStorage.getItem('dataBooks');
      }
      if (cachedBooks && dataBooks.length === 0) {
        setDataBooks(JSON.parse(cachedBooks));
      }
    };
    fetchBooks();
  }, []);

  useBooksController(LibrosData['data'], LibrosData['loading'], LibrosData['error'], ActualBookData['data']);

  if (ActualBookData['loading'] && dataBooks && dataBooks.length === 0) {
    return <Loading />;
  }

  if (ActualBookData['error'] && !dataBooks) {
    return <NoService />;
  }
  
  function handleSubmit(event) {
    event.preventDefault();
    const scriptUrl = event.currentTarget.elements.scriptUrl.value;

    if (!scriptUrl) {
      console.log('Script URL is required');
      return;
    }

    fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(dataBooks),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    }).then(res => {
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
      console.log(err)
    });
  }

  return (
    <div className='content-center-straight'>
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
    </div>
  );
};

export default AdminPage;