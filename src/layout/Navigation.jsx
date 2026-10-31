import * as React from 'react';
import { Link, NavLink } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode } from '../theme/ThemeModeProvider';
import "../App.css";

const LINKS = [
  { to: '/libros', label: 'Lista de libros' },
  { to: '/estadisticas', label: 'Estadísticas' },
  { to: '/linea-temporal', label: 'Línea temporal' },
  { to: '/sorteo', label: 'Ruleta' },
  { to: '/socios', label: 'Socios' },
];

/**
 * Navigation bar component with responsive menu and logo.
 * @returns {JSX.Element}
 */
const Navigation = () => {
  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const { isDark, toggle } = useThemeMode();
  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  return (
    <header className="header shadow-sm">
      <nav aria-label="Principal" className="content-center-straight flex min-h-16 items-center gap-2 py-2">
        <div className="md:hidden">
          <IconButton
            size="large"
            aria-label="Abrir menú de navegación"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            aria-expanded={Boolean(anchorElNav)}
            onClick={handleOpenNavMenu}
            color="inherit"
            edge="start"
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
          >
            {LINKS.map(({ to, label }) => (
              <MenuItem key={to} component={NavLink} to={to} onClick={handleCloseNavMenu} sx={{ fontWeight: 600, minHeight: 48 }}>
                {label}
              </MenuItem>
            ))}
          </Menu>
        </div>
        <Link to="/" className="mr-4 flex items-center gap-3 rounded-full pr-2 text-ink no-underline">
          <img alt="" src="/logo.webp" className="h-10 w-10 rounded-full" width={40} height={40} />
          <span className="font-display text-xl font-bold tracking-wider">Bahía Lectora</span>
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} className="nav-link">{label}</NavLink>
            </li>
          ))}
        </ul>
        <IconButton
          className="ml-auto"
          size="large"
          color="inherit"
          aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
          aria-pressed={isDark}
          onClick={toggle}
          edge="end"
        >
          {isDark ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </nav>
    </header>
  );
};

export default Navigation;
