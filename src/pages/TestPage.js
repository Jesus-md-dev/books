import { useState } from 'react';
import Button from '@mui/material/Button';
import Loading from '../component/loading';
import NoService  from '../component/noService';
import { useFetchBooks } from '../controller/bookDataController';
import { TextField } from '@mui/material';
import * as React from 'react'



/**
 * TestPage component displaying books in a data grid.
 * @returns {JSX.Element}
 */
const TestPage = () => {
  const [dataBooks, setDataBooks] = useState([]);

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