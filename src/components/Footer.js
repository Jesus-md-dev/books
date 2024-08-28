import { Toolbar } from '@mui/material';
import Container from '@mui/material/Container';


const Footer = () => {
    var year = new Date().getFullYear()
    return (
      <>
      <Toolbar className='bg-black h-2 w-full bottom-0 footer'>
        <Container maxWidth="xl">
          Copyright © {year}
        </Container>
      </Toolbar>
      </>
    )
  }

  export default Footer