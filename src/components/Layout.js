import Footer from "./Footer";
import Navbar from './Navigation';
import Container from '@mui/material/Container';

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <Container maxWidth="xl">
      <main>{children}</main>
      </Container>
      <Footer />
    </>
  )
}