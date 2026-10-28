const test = require('node:test');
const assert = require('node:assert/strict');

test('reads the spreadsheet ID from GOOGLE_BOOK_SHEET_ID', () => {
  const modulePath = require.resolve('./sheetConfig');
  const previousSheetId = process.env.GOOGLE_BOOK_SHEET_ID;

  try {
    delete process.env.GOOGLE_BOOK_SHEET_ID;
    delete require.cache[modulePath];
    assert.equal(require('./sheetConfig').SHEET_ID, undefined);

    process.env.GOOGLE_BOOK_SHEET_ID = 'configured-spreadsheet';
    delete require.cache[modulePath];
    assert.equal(require('./sheetConfig').SHEET_ID, 'configured-spreadsheet');
  } finally {
    if (previousSheetId === undefined) delete process.env.GOOGLE_BOOK_SHEET_ID;
    else process.env.GOOGLE_BOOK_SHEET_ID = previousSheetId;
    delete require.cache[modulePath];
  }
});
