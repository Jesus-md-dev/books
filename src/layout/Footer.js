
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

/**
 * Footer component with copyright and Instagram link.
 * @returns {JSX.Element}
 */
const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <div className="bg-black w-full bottom-0 footer h-20 absolute">
      <Container maxWidth="xl" className="h-full">
        <div className="flex justify-between h-full items-center">
          <span className="font-semibold">Copyright © {year}</span>
          <Button href="https://www.instagram.com/bahia.lectora/">
            <img alt="Instagram" src="/instagram.svg" />
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default Footer;