/**
 * Footer component with copyright and Instagram link.
 * @returns {JSX.Element}
 */
const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="content-center-straight flex min-h-20 items-center justify-between gap-4 py-4">
        <span className="font-semibold">© {year} Bahía Lectora</span>
        <a
          href="https://www.instagram.com/bahia.lectora/"
          className="flex items-center gap-2 rounded px-2 py-1 font-semibold text-ink hover:underline"
        >
          <img alt="" src="/instagram.svg" className="h-6 w-6" width={24} height={24} />
          <span>Instagram</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
