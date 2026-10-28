const test = require('node:test');
const assert = require('node:assert/strict');

test('prefers GOOGLE_BOOK_SHEET_ID, supports BAHIA_SHEETS_ID, and falls back to the default', () => {
  const modulePath = require.resolve('./sheetConfig');
  const previousBahiaSheetId = process.env.BAHIA_SHEETS_ID;
  const previousSheetId = process.env.GOOGLE_BOOK_SHEET_ID;

  try {
    delete process.env.BAHIA_SHEETS_ID;
    delete process.env.GOOGLE_BOOK_SHEET_ID;
    delete require.cache[modulePath];
    assert.equal(require('./sheetConfig').SHEET_ID, '1iC7cs6dC1Tz6LdrRoiW823LziTqerPjACCRqldwSwKM');

    process.env.GOOGLE_BOOK_SHEET_ID = 'configured-spreadsheet';
    delete require.cache[modulePath];
    assert.equal(require('./sheetConfig').SHEET_ID, 'configured-spreadsheet');

    process.env.BAHIA_SHEETS_ID = 'documented-spreadsheet';
    delete require.cache[modulePath];
    assert.equal(require('./sheetConfig').SHEET_ID, 'configured-spreadsheet');

    delete process.env.GOOGLE_BOOK_SHEET_ID;
    delete require.cache[modulePath];
    assert.equal(require('./sheetConfig').SHEET_ID, 'documented-spreadsheet');
  } finally {
    if (previousBahiaSheetId === undefined) delete process.env.BAHIA_SHEETS_ID;
    else process.env.BAHIA_SHEETS_ID = previousBahiaSheetId;
    if (previousSheetId === undefined) delete process.env.GOOGLE_BOOK_SHEET_ID;
    else process.env.GOOGLE_BOOK_SHEET_ID = previousSheetId;
    delete require.cache[modulePath];
  }
});
