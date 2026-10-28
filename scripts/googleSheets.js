const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

async function fetchWithSheetsApi(sheetId, tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet?ranges=${encodeURIComponent(tabName)}&key=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sheets API HTTP ${response.status}`);
  const result = await response.json();
  const rows = result.valueRanges?.[0]?.values || [];
  if (!rows.length) return [];

  const headers = rows[0];
  const records = rows.slice(1).filter((row) => row.length).map((row) =>
    row.reduce((record, value, index) => {
      record[headers[index]] = value;
      return record;
    }, {}),
  );
  Object.defineProperty(records, 'sheetHeaders', {
    value: headers.slice(1).filter(Boolean),
    enumerable: false,
  });
  return records;
}

async function fetchWithPublicEndpoint(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch "${tabName}": HTTP ${response.status}`);
  }

  const body = await response.text();
  const jsonStart = body.indexOf('{');
  const jsonEnd = body.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    throw new Error(`Unexpected response while fetching "${tabName}"`);
  }

  const result = JSON.parse(body.slice(jsonStart, jsonEnd + 1));
  if (!result.table || result.status === 'error') {
    throw new Error(`Could not read sheet tab "${tabName}"`);
  }

  const headers = result.table.cols.map((column, index) =>
    column.label || (tabName === 'Actual' && index === 0 ? 'actual' : ''),
  );

  const records = (result.table.rows || []).slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      const key = header || (index === 0 ? '' : `column${index}`);
      const cell = row.c && row.c[index];
      if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
        record[key] = cell.v;
      }
    });
    return record;
  });

  Object.defineProperty(records, 'sheetHeaders', {
    value: headers.slice(1).filter(Boolean),
    enumerable: false,
  });
  return records;
}

async function fetchSheetRows(sheetId, tabName) {
  if (API_KEY) {
    try {
      return await fetchWithSheetsApi(sheetId, tabName);
    } catch (error) {
      console.warn(`[googleSheets] ${error.message}; using the public sheet endpoint.`);
    }
  }
  return fetchWithPublicEndpoint(sheetId, tabName);
}

module.exports = { fetchSheetRows };
