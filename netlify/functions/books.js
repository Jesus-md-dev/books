const cachedBooks = require('../../src/data/books.json');

const API_KEY = process.env.GOOGLE_API_KEY;
const DATA_SHEET_ID = process.env.DATA_SHEET_ID;
const BOOK_SHEET_ID = process.env.GOOGLE_BOOK_SHEET_ID;

async function fetchRows(sheetId, tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=${encodeURIComponent(tabName)}&key=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sheets API ${response.status}`);
  const result = await response.json();
  const rows = result.valueRanges?.[0]?.values || [];
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter((row) => row.length).map((row) =>
    row.reduce((record, value, index) => {
      record[headers[index]] = value;
      return record;
    }, {}),
  );
}

function calculateBooks(voteRows, currentTitle) {
  const byTitle = new Map();
  for (const row of voteRows) {
    const member = row[''];
    for (const [title, rawVote] of Object.entries(row)) {
      if (!title) continue;
      const vote = Number.parseFloat(String(rawVote).replace(',', '.'));
      if (Number.isNaN(vote)) continue;
      if (!byTitle.has(title)) byTitle.set(title, { votos: [], sum: 0 });
      const entry = byTitle.get(title);
      entry.votos.push({ nombre: member, voto: vote });
      entry.sum += vote;
    }
  }

  const orderRow = voteRows.find((row) => Object.keys(row).length - 1 === byTitle.size);
  const order = orderRow ? Object.keys(orderRow).slice(1) : [...byTitle.keys()];
  const titles = order.filter((title) => title !== currentTitle);
  if (!titles.includes(currentTitle)) titles.push(currentTitle);

  return titles.map((title, id) => {
    const votes = byTitle.get(title) || { votos: [], sum: 0 };
    const saved = cachedBooks.find((book) => book.titulo === title) || {};
    const count = votes.votos.length;
    return {
      ...saved,
      id,
      titulo: title,
      n_votos: count,
      sum_votos: votes.sum,
      media: count ? (votes.sum / count).toFixed(2) : 0,
      votos: votes.votos,
    };
  });
}

exports.handler = async () => {
  if (!API_KEY || !DATA_SHEET_ID || !BOOK_SHEET_ID) {
    return { statusCode: 503, body: 'Google Sheets no está configurado' };
  }

  try {
    const [voteRows, currentRows] = await Promise.all([
      fetchRows(BOOK_SHEET_ID, 'Libros'),
      fetchRows(DATA_SHEET_ID, 'Actual'),
    ]);
    const currentTitle = currentRows[0]?.actual;
    if (!currentTitle) throw new Error('No se encontró el libro actual');
    const latest = calculateBooks(voteRows, currentTitle);
    const changed = JSON.stringify(latest) !== JSON.stringify(cachedBooks);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(changed ? latest : cachedBooks),
    };
  } catch (error) {
    console.error('[books function]', error);
    return { statusCode: 502, body: 'No se pudieron consultar los datos de Google Sheets' };
  }
};
