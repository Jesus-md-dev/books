import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import "../App.css";

function Navigation() {
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  return (
    <>
    <div className='header'>
    <AppBar color="green_book" position="static" className='text-black'>
      <Container maxWidth="xl">
        <Toolbar disableGutters >
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
                <MenuItem onClick={handleCloseNavMenu} >
                  <Button
                className='menu-item font-bold text-black	'
                href='/libros'>
                  <Typography sx={{ textAlign: 'center' }}>LISTA DE LIBROS</Typography>
                </Button>
                </MenuItem>
            </Menu>
          </Box>
          <Button href="/">
            <Avatar alt="Bahía Lectora logo" src={"/logo.jpg"} className='mr-6  w-auto' />
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
          </Button>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              <Button
                className='menu-item font-bold'
                href='/libros'
                sx={{ my: 2, color: 'black', display: 'block' }}
              >
                LISTA DE LIBROS
              </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
    </div>
    </>
  );
}
export default Navigation;