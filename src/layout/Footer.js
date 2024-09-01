import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

function Footer () {
    var year = new Date().getFullYear()
    return (
      <>
      <div className='bg-black w-full bottom-0 footer h-20 absolute'>
        <Container maxWidth="xl" className='h-full'>
          <div className='flex justify-between h-full items-center'>
            <span className='font-semibold'>Copyright © {year}</span>
            <Button href="https://www.instagram.com/bahia.lectora/">
              <img alt="Instagram" width="" height="" src="/instagram.svg"></img>
            </Button>
          </div>
        </Container>
      </div>
      </>
    )
  }

  export default Footer