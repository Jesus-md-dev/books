import { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Loading from '../component/loading';
import NoService  from '../component/noService';
import { useFetchBooks } from '../controller/bookDataController';
import { TextField } from '@mui/material';
import * as React from 'react'
import useGoogleSheets from 'use-google-sheets';
import { useBooksController } from '../controller/useBooksController';


/**
 * TestPage component displaying books in a data grid.
 * @returns {JSX.Element}
 */
const TestPage = () => {
  const [dataBooks, setDataBooks] = useState([]);

  //  const { data, loading, error } = useGoogleSheets({
  //   apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
  //   sheetId: process.env.REACT_APP_GOOGLE_BOOK_SHEET_ID,
  //   sheetsOptions: [{ id: 'Libros' }],
  // });

  // useEffect(() => {
  //   const fetchBooks = async () => {
  //     let cachedBooks = localStorage.getItem('dataBooks');
  //     while (!cachedBooks || cachedBooks.length === 0) {
  //       await new Promise(resolve => setTimeout(resolve, 1000));
  //       console.log('No books found, checking cache...');
  //       cachedBooks = localStorage.getItem('dataBooks');
  //     }
  //     if (cachedBooks && dataBooks.length === 0) {
  //       setDataBooks(JSON.parse(cachedBooks));
  //     }
  //   };
  //   fetchBooks();
  //   // eslint-disable-next-line
  // }, []);

  // useBooksController(data, loading, error);

  useFetchBooks().then((books) => {
    setDataBooks(books);
  });

  if (dataBooks && dataBooks.length === 0) {
    return <Loading />;
  }

  if (!dataBooks) {
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
    <div>
      <h1>Post Data</h1>
      <form onSubmit={handleSubmit}>

      <TextField
        name='scriptUrl'
        rows={10}
        style={{ width: '100%' }}
        />
        <Button type='submit'>Submit</Button>
      </form>
    </div>
  );
};

export default TestPage;