import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Starts every new page at the top. Going back or forward keeps the browser's own behaviour, and
 * a change of the query string only (the catalog filters live in the URL) does not move the page.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
