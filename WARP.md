# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Bahía Lectora is a React-based book club management web application that displays book ratings, voting data, and book information from Google Sheets and Google Books API. The app features:

- Book voting system with rating aggregation
- Google Sheets integration for data storage
- Google Books API integration for book metadata
- Responsive UI with Material-UI components
- Local storage caching for performance

## Development Commands

### Environment Setup
```bash
npm install
```

### Development
```bash
npm start          # Start development server on localhost:3000
npm test           # Run tests in watch mode
npm run build      # Build production bundle
npm run eject      # Eject from Create React App (one-way operation)
```

### Environment Variables Required
Create a `.env` file with:
```
REACT_APP_GOOGLE_API_KEY=your_google_api_key
REACT_APP_GOOGLE_BOOK_SHEET_ID=your_google_sheets_id
```

## Architecture Overview

### Data Flow Architecture
The application follows a layered architecture with clear separation of concerns:

1. **Data Layer**: Google Sheets API provides raw voting data
2. **Controller Layer**: `useBooksController` and `bookController` handle data transformation
3. **Presentation Layer**: React components render the UI
4. **Caching Layer**: LocalStorage provides offline capabilities

### Key Components Structure

```
src/
├── pages/           # Route-level components
├── layout/          # Navigation and Footer components  
├── component/       # Reusable UI components
├── controller/      # Business logic and data management
├── entity/          # Data models and parsing utilities
```

### Data Processing Pipeline

1. **Raw Data Ingestion**: `useGoogleSheets` hook fetches voting data from Google Sheets
2. **Data Transformation**: `fetchData()` converts voting data into book objects with aggregated ratings
3. **API Enrichment**: `getGoogleData()` enriches books with metadata from Google Books API
4. **Caching Strategy**: Books are cached in localStorage for performance and offline access
5. **Reactive Updates**: `useBooksController` manages state synchronization across components

### Core Controllers

- **`useBooksController`**: React hook managing book data lifecycle and caching
- **`bookController`**: Contains data processing functions and Google Books API integration
- **Book Entity**: Static utility class for parsing book data from different sources

### API Integration Patterns

- **Google Sheets**: Processes raw voting data into aggregated ratings
- **Google Books**: Enriches book metadata (covers, authors, descriptions) with fallback handling
- **Rate Limiting**: Implements delays and retry logic for API calls
- **Error Handling**: Graceful degradation when APIs are unavailable

### Routing Structure
- `/` - Home page with current and previous books
- `/libros` - Book list in data grid format
- `/libro/:title` - Individual book detail page
- `/sorteo` - Book draw/lottery page (commented out)

### Styling Architecture
- **Tailwind CSS**: Utility-first styling framework
- **Material-UI**: Component library for consistent UI elements
- **Custom CSS**: Additional styles in App.css and index.css
- **Responsive Design**: Mobile-first approach with breakpoint-based layouts

## Development Notes

### Local Storage Strategy
- Books are cached as `dataBooks` in localStorage
- Cache is updated when new data is fetched from Google Sheets
- Components wait for cached data before rendering to avoid loading states

### API Rate Limiting
- Google Books API calls include delays to prevent rate limiting
- Implements retry logic with exponential backoff
- Uses multiple query strategies for better book matching

### Error Handling Patterns
- `NoService` component for API failures
- `Loading` component for async operations
- Graceful fallbacks for missing book metadata

### Data Synchronization
- Multiple components use the same controller hook
- LocalStorage serves as the single source of truth
- Polling mechanism ensures data freshness

## Deployment Configuration

- **Netlify Ready**: `_redirects` file configured for SPA routing
- **Build Output**: Static files in `/build` directory
- **Environment Variables**: Configure through deployment platform settings
