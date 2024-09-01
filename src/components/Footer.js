import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Image from 'next/image';
import instagramIcon from "../../public/instagram.svg";



const Footer = () => {
    var year = new Date().getFullYear()
    return (
      <>
      <div className='bg-black h-2 w-full bottom-0 footer h-20'>
        <Container maxWidth="xl" className='h-full'>
          <div className='flex justify-between h-full items-center'>
            <span className='font-semibold'>Copyright © {year}</span>
            <Button href="https://www.instagram.com/bahia.lectora/">
              <Image alt="Instagram" width="" height="" src={instagramIcon}></Image>
            </Button>
          </div>
        </Container>
      </div>
      </>
    )
  }

  export default Footer