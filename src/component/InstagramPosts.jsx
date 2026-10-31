import { useEffect, useRef } from 'react';
import posts from '../data/instagramPosts.json';
import { validPostUrls } from '../utils/instagram';

const EMBED_SRC = 'https://www.instagram.com/embed.js';
const urls = validPostUrls(posts);

function processEmbeds() {
  window.instgrm?.Embeds.process();
}

/**
 * Instagram posts embedded with the official embed script, loaded only when the section is near the viewport.
 * Renders nothing while src/data/instagramPosts.json has no valid posts.
 * @returns {JSX.Element|null}
 */
const InstagramPosts = () => {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || urls.length === 0) return undefined;
    const load = () => {
      if (window.instgrm) {
        processEmbeds();
        return;
      }
      let script = document.querySelector(`script[src="${EMBED_SRC}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = EMBED_SRC;
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', processEmbeds, { once: true });
    };
    if (!('IntersectionObserver' in window)) {
      load();
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (urls.length === 0) return null;

  return (
    <section className="section" aria-labelledby="instagram" ref={ref}>
      <h2 id="instagram" className="section-title">Síguenos en Instagram</h2>
      <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6">
        {urls.map((url) => (
          <li key={url} className="w-full max-w-sm">
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={url}
              data-instgrm-version="14"
              style={{ margin: 0, width: '100%', minWidth: 0 }}
            >
              <a href={url} className="text-link">Ver publicación en Instagram</a>
            </blockquote>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default InstagramPosts;
