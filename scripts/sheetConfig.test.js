const test = require('node:test');
const assert = require('node:assert/strict');

test('defaults to the test clone and accepts a spreadsheet override', () => {
  const modulePath = require.resolve('./sheetConfig');
  const previousSheetId = process.env.BAHIA_SHEETS_ID;

  try {
    delete process.env.BAHIA_SHEETS_ID;
    delete require.cache[modulePath];
    assert.equal(
      require('./sheetConfig').SHEET_ID,
      '1iC7cs6dC1Tz6LdrRoiW823LziTqerPjACCRqldwSwKM',
    );

    process.env.BAHIA_SHEETS_ID = 'configured-spreadsheet';
    delete require.cache[modulePath];
    assert.equal(require('./sheetConfig').SHEET_ID, 'configured-spreadsheet');
  } finally {
    if (previousSheetId === undefined) delete process.env.BAHIA_SHEETS_ID;
    else process.env.BAHIA_SHEETS_ID = previousSheetId;
    delete require.cache[modulePath];
  }
});
