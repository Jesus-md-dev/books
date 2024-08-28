import { Toolbar } from '@mui/material';
import Container from '@mui/material/Container';


const Footer = () => {
    var year = new Date().getFullYear()
    return (
      <Toolbar fixed className='bg-black h-2 w-full bottom-0 absolute footer'>
        <Container maxWidth="xl">
          Copyright © {year}
        </Container>
      </Toolbar>
    )
  }

  export default Footer