import { useState } from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import ShareIcon from '@mui/icons-material/Share';
import { SITE_URL } from './PageMeta';

function copyWithFallback(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Non-secure contexts: hidden textarea + execCommand.
  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(area);
    }
  });
}

/**
 * Shares a book page: Web Share API where available, otherwise copies the
 * canonical link and shows an "Enlace copiado" notice.
 * @param {{path: string, title: string, text?: string}} props - path is the canonical path (bookPath).
 */
export default function ShareButton({ path, title, text = '' }) {
  const [message, setMessage] = useState('');
  const url = SITE_URL + path;

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // user closed the share sheet
        // Any other failure: fall back to copying.
      }
    }
    try {
      await copyWithFallback(url);
      setMessage('Enlace copiado');
    } catch {
      setMessage('No se pudo copiar el enlace');
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<ShareIcon />}
        onClick={handleShare}
        aria-label={`Compartir «${title}»`}
      >
        Compartir
      </Button>
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={2500}
        onClose={() => setMessage('')}
        message={<span role="status" aria-live="polite">{message}</span>}
      />
    </>
  );
}
