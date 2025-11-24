# Performance Optimization Guide

This document outlines the performance optimizations implemented to achieve a 100/100 Lighthouse score.

## Current Implementation Status

### ✅ Completed Optimizations

#### 1. Code Splitting (Target: +2s savings)
- **Implementation**: React.lazy() for all route components
- **Impact**: Reduces initial JavaScript bundle size
- **Files Modified**: 
  - `src/App.js` - Lazy loading for Home, BookList, BookPage, DrawBook, AdminPage
- **How it works**: Each route loads its JavaScript only when navigated to

#### 2. Resource Hints (Target: +0.32s savings)
- **Implementation**: Preconnect to external origins
- **Impact**: Reduces DNS lookup and connection time for Google APIs
- **Files Modified**: 
  - `public/index.html` - Added preconnect for googleapis.com, sheets.googleapis.com
- **Resources preconnected**:
  - Google Fonts API
  - Google Sheets API
  - Google Books API (dns-prefetch)

#### 3. PWA Configuration (Target: Pass all PWA checks)
- **Implementation**: 
  - Created `service-worker.js` for offline support
  - Updated `manifest.json` with proper icons and metadata
  - Registered service worker in `index.js`
- **PWA Features**:
  - Offline caching of essential resources
  - 192x192 and 512x512 icons (need to be created)
  - Maskable icon support
  - Apple touch icon

#### 4. Main-Thread Optimization (Target: Reduce 13.5s to <5s)
- **Implementation**: 
  - Chunked processing of Google Books API calls (3 books at a time)
  - Reduced error wait time from 60s to 5s
  - Added `setTimeout(0)` between chunks to yield to main thread
- **Files Modified**: 
  - `src/controller/bookController.js`
  - `src/pages/Home.js` - Fixed useFetchBooks to only run on mount

#### 5. Image Optimization Prep
- **Implementation**: 
  - Added explicit `loading="lazy"` for below-fold images
  - Added `loading="eager"` for above-fold content
  - Logo already in WebP format
- **Next Steps**: See "Remaining Tasks" below

### ⚠️ Remaining Tasks

#### 1. Generate PWA Icons
**Priority**: HIGH (blocks PWA installability)

**Current Issue**: `logo192.png` and `logo512.png` don't exist

**Solution Options**:

A. **Recommended**: Use online tool
```powershell
# 1. Visit https://realfavicongenerator.net/
# 2. Upload your logo (preferably 1024x1024 PNG or SVG)
# 3. Configure options (maskable icon is important for PWA)
# 4. Download generated icons
# 5. Place files in public/ folder:
#    - logo192.png
#    - logo512.png
```

B. **Quick**: Manual creation
```powershell
# Use any image editor to create:
# - logo192.png (192x192px)
# - logo512.png (512x512px)
# Save both to public/ folder
```

**Verify icons**:
```powershell
npm run check-icons
```

#### 2. Image Optimization
**Priority**: HIGH (0.77s + 0.47s + 0.32s = 1.56s potential savings)

**Current Issue**: Images are not in next-gen formats and may be oversized

**Solutions**:

A. Convert placeholder image to WebP:
```powershell
# Current placeholder in bookController.js:
# https://i.pinimg.com/736x/e0/e9/78/e0e978256054db86ff9690df51d6cd8d.jpg

# Option 1: Download and convert locally
# Install imagemagick or use online converter
# magick convert placeholder.jpg -quality 80 placeholder.webp

# Option 2: Use a smaller, optimized placeholder
# Replace with a locally hosted WebP image
```

B. Implement responsive images with srcset:
```javascript
// In Home.js, BookList.js, etc., replace:
<img src={book.imagen} alt={book.titulo} />

// With:
<img 
  src={book.imagen}
  srcSet={`${book.imagen}?w=150 150w, ${book.imagen}?w=300 300w`}
  sizes="(max-width: 640px) 150px, 300px"
  alt={book.titulo}
  width={150}
  height={225}
  loading="lazy"
/>
```

C. Add explicit width/height to ALL images:
```javascript
// Already partially done in Home.js
// Apply to BookList.js, BookPage.js, DrawBook.js
width={150}
height={225}  // Assuming 2:3 aspect ratio
```

#### 3. Passive Event Listeners
**Priority**: MEDIUM (improves scroll performance)

**Issue**: Touch/wheel event listeners should be passive

**Solution**: If you have custom scroll handlers, add `{ passive: true }`:
```javascript
// Example (if you add custom scroll handling):
element.addEventListener('touchstart', handler, { passive: true });
element.addEventListener('wheel', handler, { passive: true });
```

**Note**: Check if Material-UI components use non-passive listeners (may need library update)

#### 4. Bundle Analysis
**Priority**: MEDIUM (identify unused JavaScript)

**Run bundle analyzer**:
```powershell
# 1. Build the app
npm run build

# 2. Install analyzer (one-time)
npm install --save-dev source-map-explorer

# 3. Analyze bundle
npm run analyze
```

**Look for**:
- Duplicate dependencies
- Large libraries that could be replaced
- Unused exports from libraries

**Optimization ideas**:
- Replace heavy libraries with lighter alternatives
- Use tree-shaking friendly imports: `import { Button } from '@mui/material/Button'` instead of `import { Button } from '@mui/material'`
- Consider replacing `axios` with native `fetch` (already using fetch in some places)

#### 5. Reduce Network Payload
**Priority**: HIGH (currently 13.8MB)

**Current Issues**:
- Large JavaScript bundles
- Uncompressed or inefficiently compressed assets
- Many API calls to Google Books

**Solutions**:

A. Enable gzip/brotli compression on Netlify:
```toml
# Add to netlify.toml (create if doesn't exist)
[[headers]]
  for = "/*"
  [headers.values]
    Content-Encoding = "br"  # Brotli compression
```

B. Optimize Google Books API calls:
- Cache results more aggressively
- Fetch book details on-demand instead of all at once
- Use smaller image sizes from Google Books API

C. Consider lazy loading book images:
```javascript
// Use Intersection Observer for better control
import { useEffect, useRef, useState } from 'react';

function LazyImage({ src, alt, ...props }) {
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.unobserve(entry.target);
        }
      });
    });
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src]);

  return <img ref={imgRef} src={imageSrc} alt={alt} {...props} />;
}
```

## Testing Performance

### Local Testing
```powershell
# 1. Build production version
npm run build

# 2. Serve locally (install serve if needed)
npx serve -s build

# 3. Run Lighthouse in Chrome DevTools
# - Open Chrome DevTools (F12)
# - Go to Lighthouse tab
# - Select "Performance" + "PWA"
# - Run audit
```

### Netlify Testing
```powershell
# After deploying to Netlify:
# 1. Visit your site
# 2. Run Lighthouse (Chrome DevTools or web.dev/measure)
# 3. Check for improvements
```

## Performance Checklist

Before each deployment:

- [ ] Icons created (192px and 512px)
- [ ] Service worker registered and working
- [ ] All images have explicit width/height
- [ ] Below-fold images have loading="lazy"
- [ ] Preconnect links in place
- [ ] Bundle analyzed for large dependencies
- [ ] Lighthouse score checked locally
- [ ] Tested on slow 4G throttling

## Quick Commands

```powershell
# Check PWA icons status
npm run check-icons

# Analyze bundle size
npm run build
npm run analyze

# Local performance test
npm run build
npx serve -s build
# Then run Lighthouse in DevTools

# Check service worker
# Visit: chrome://serviceworker-internals/
```

## Expected Results

After implementing all optimizations:

| Metric | Current | Target |
|--------|---------|--------|
| Performance | 37 | 90+ |
| FCP | 0.9s | <1.8s |
| LCP | 3.7s | <2.5s |
| TBT | 2,230ms | <200ms |
| Speed Index | 35.7s | <3.4s |
| Bundle Size | 13.8MB | <3MB |
| PWA | 37 | 100 |

## Resources

- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [Web.dev Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit#optimizing-performance)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Image Optimization](https://web.dev/fast/#optimize-your-images)
