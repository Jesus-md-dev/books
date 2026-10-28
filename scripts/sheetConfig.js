const DEFAULT_SHEET_ID = '1iC7cs6dC1Tz6LdrRoiW823LziTqerPjACCRqldwSwKM';

// Keep the documented variable first, while accepting the previous name used
// by existing local and Netlify configurations.
const SHEET_ID = process.env.BAHIA_SHEETS_ID
  || process.env.GOOGLE_BOOK_SHEET_ID
  || DEFAULT_SHEET_ID;

module.exports = { SHEET_ID };
