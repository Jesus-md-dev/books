# Bahía Lectora 📚

A modern, performant Progressive Web App (PWA) for managing a book club in the Bahía de Cádiz. Built with React and optimized for Lighthouse 100/100 scores.

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/bahia-lectora/deploys)

## ✨ Features

- 📖 **Book Management**: View current and past book club selections
- ⭐ **Ratings System**: Track member ratings and reviews
- 🗺️ **Meeting Locations**: Integrated Google Maps for meetup locations
- 🎲 **Book Draw**: Random selection tool for next book club read
- 👥 **Admin Panel**: Submit book data to Google Sheets backend
- 📱 **PWA Support**: Install as native app with offline capabilities
- ⚡ **Performance Optimized**: Code splitting, lazy loading, and resource hints

## 🚀 Quick Start

### Prerequisites

- Node.js v22+ and npm
- Google Sheets API key and Sheet IDs
- Google Books API key (optional for enhanced book data)

### Installation

```bash
# Clone the repository
git clone https://github.com/Jesus-md-dev/books.git
cd books

# Install dependencies
npm install

# Set up environment variables (see Configuration below)
cp .env.example .env

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
REACT_APP_GOOGLE_API_KEY=your_google_api_key
REACT_APP_GOOGLE_BOOK_SHEET_ID=your_book_sheet_id
REACT_APP_DATA_SHEET_ID=your_data_sheet_id
REACT_APP_GOOGLE_CLIENT_EMAIL=your_service_account_email
REACT_APP_GOOGLE_PRIVATE_KEY=your_service_account_private_key
```

## 📦 Available Scripts

### Development

```bash
npm start              # Run development server (localhost:3000)
npm test               # Launch test runner
npm run save-server    # Run dev server for admin form testing
```

### Production

```bash
npm run build          # Create optimized production build
npm run analyze        # Analyze bundle size with source-map-explorer
```

### Utilities

```bash
npm run check-icons    # Verify PWA icon files exist
```

```

## 🏗️ Project Structure

```
books/
├── public/              # Static files
│   ├── service-worker.js    # PWA offline support
│   ├── manifest.json        # PWA manifest
│   └── logo*.png           # App icons (192px, 512px)
├── src/
│   ├── assets/         # Images and static resources
│   ├── components/     # Reusable React components
│   ├── component/      # Utility components (loading, stars, etc.)
│   ├── controller/     # Data fetching and business logic
│   ├── layout/         # Navigation and footer
│   ├── pages/          # Route components (lazy loaded)
│   │   ├── Home.js
│   │   ├── BookList.js
│   │   ├── BookPage.js
│   │   ├── DrawBook.js
│   │   └── AdminPage.js
│   └── App.js          # Main app with React Router
├── scripts/            # Build and utility scripts
├── server/             # Development servers
└── build/              # Production build output
```

## 🎨 Tech Stack

- **Frontend**: React 18, React Router v6
- **UI Components**: Material-UI (MUI), React Bootstrap
- **Styling**: Tailwind CSS, Sass
- **Data Source**: Google Sheets API (via use-google-sheets)
- **API Integration**: Google Books API for book metadata
- **PWA**: Service Worker with cache-first strategy
- **Build Tool**: Create React App with code splitting
- **Deployment**: Netlify

## 🚀 Performance Optimizations

This app is optimized for Lighthouse 100/100 scores:

- ✅ **Code Splitting**: React.lazy() for route-based chunks
- ✅ **Resource Hints**: Preconnect to external APIs
- ✅ **Image Optimization**: Lazy loading, WebP format, explicit dimensions
- ✅ **Main-Thread Optimization**: Chunked API processing
- ✅ **PWA Features**: Offline support, installable
- ✅ **Bundle Analysis**: source-map-explorer for optimization

See [PERFORMANCE.md](PERFORMANCE.md) for detailed optimization guide.

## 📱 PWA Setup

### Required Icons

Before deploying, create PWA icons:

1. Visit [Real Favicon Generator](https://realfavicongenerator.net/)
2. Upload your logo (1024×1024 recommended)
3. Download and extract:
   - `logo192.png` → `public/`
   - `logo512.png` → `public/`

Verify icons: `npm run check-icons`

### Service Worker

The service worker is automatically registered in production builds and provides:
- Offline functionality
- Faster repeat visits through caching
- App shell architecture

## 🌐 Deployment

### Netlify (Recommended)

1. **Connect Repository**:
   - Link GitHub repo to Netlify
   - Branch: `main` or `test`

2. **Configure Build**:
   ```
   Build command: npm run build
   Publish directory: build
   ```

3. **Environment Variables**:
   Add all `REACT_APP_*` variables in Netlify dashboard

4. **Deploy**: Push to GitHub triggers automatic deployment

### Manual Deployment

```bash
npm run build
# Deploy the `build/` folder to any static host
```

## 🧪 Testing & Quality

### Local Performance Testing

```bash
# Build production version
npm run build

# Serve locally
npx serve -s build

# Run Lighthouse in Chrome DevTools (F12 > Lighthouse)
```

### Bundle Analysis

```bash
npm run build
npm run analyze
```

This opens an interactive treemap showing:
- Bundle composition
- Largest dependencies
- Optimization opportunities

## 📚 Documentation

- [PERFORMANCE.md](PERFORMANCE.md) - Comprehensive optimization guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Pre/post deployment steps
- [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) - Quick reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Build Fails with Hook Errors

Ensure `useFetchBooks` is called at component top level:
```javascript
const booksPromise = useFetchBooks(); // ✅ Top level
useEffect(() => {
  booksPromise.then(setBooks);
}, [booksPromise]);
```

### Service Worker Not Updating

```bash
# Clear cache
# Chrome: DevTools > Application > Clear Storage
# Or hard reload: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### Icons Missing in PWA

```bash
npm run check-icons
# Follow instructions to create logo192.png and logo512.png
```

## 📄 License

This project is built with Create React App. See the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started) for details.

## 🙋 Support

For issues or questions:
- Check [PERFORMANCE.md](PERFORMANCE.md) for optimization help
- Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for deployment issues
- Open an issue on GitHub

---

**Built with ❤️ for Bahía Lectora book club**
