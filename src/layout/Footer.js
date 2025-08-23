

import Container from '@mui/material/Container';

/**
 * Footer component with copyright and Instagram link.
 * @returns {JSX.Element}
 */
const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <div className="bg-black w-full bottom-0 footer" style={{ height: '5rem', position: 'absolute', zIndex: 10 }}>
      <div className='content-center-straight h-full'>
      <div className="flex justify-between items-center" style={{ height: '100%' }}>
        <span className="font-semibold">Copyright © {year}</span>
        <a href="https://www.instagram.com/bahia.lectora/">
        <img alt="Instagram" src="/instagram.svg" style={{ height: '1.5rem', width: '1.5rem' }} />
        </a>
      </div>
      </div>
    </div>
    );
};

export default Footer;