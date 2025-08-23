
import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import "../App.css";


/**
 * Navigation bar component with responsive menu and logo.
 * @returns {JSX.Element}
 */
const Navigation = () => {
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  return (
    <div className="header">
      <AppBar color="green_book" position="static" className="text-black">
        <div className='content-center-straight'>
          <Toolbar disableGutters>
            <Box sx={{ flexGrow: 0.453, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{ display: { xs: 'block', md: 'none' } }}
              >
                <MenuItem onClick={handleCloseNavMenu}>
                  <a
                    className="menu-item font-bold text-black"
                    href="/libros"
                  >
                    <Typography sx={{ textAlign: 'center' }}>LISTA DE LIBROS</Typography>
                  </a>
                </MenuItem>
              </Menu>
            </Box>
            <a href="/" className='flex items-center'>
              <img alt="Bahía Lectora logo" src="/logo.jpg" className="mr-6 rounded-full w-10 h-10" />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  mr: 2,
                  display: { xs: 'none', md: 'flex' },
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '.3rem',
                  color: 'black',
                  textDecoration: 'none',
                }}
              >
                Bahía Lectora
              </Typography>
            </a>
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              <a
                className="menu-item font-bold"
                href="/libros"
                sx={{ my: 2, color: 'black', display: 'block' }}
              >
                LISTA DE LIBROS
              </a>
              {/* <Button
                className="menu-item font-bold"
                href="/sorteo"
                sx={{ my: 2, color: 'black', display: 'block' }}
              >
                Sorteo
              </Button> */}
            </Box>
          </Toolbar>
        </div>
      </AppBar>
    </div>
  );
};

export default Navigation;