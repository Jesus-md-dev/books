import { google } from 'googleapis';

export async function getServerSideProps({ query }) {
  const auth = new google.auth.GoogleAuth({
    credentials:{
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "n")
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  const sheets = google.sheets({ version: 'v4', auth });
  const { id } = query;
  const range = 'TEST!A:Z';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  });

  const data = response.data.values;

  return {
      props: {
        data
      }
  }
}

export default function Post({ data }) {
    return <article>
        <div>{data}</div>
    </article>
}