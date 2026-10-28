const DEFAULT_SHEET_ID = '1iC7cs6dC1Tz6LdrRoiW823LziTqerPjACCRqldwSwKM';

// Prefer the spreadsheet configured by the original build/runtime setup.
// BAHIA_SHEETS_ID remains supported as a fallback for newer deployments.
const SHEET_ID = process.env.GOOGLE_BOOK_SHEET_ID
  || process.env.BAHIA_SHEETS_ID
  || DEFAULT_SHEET_ID;

module.exports = { SHEET_ID };
