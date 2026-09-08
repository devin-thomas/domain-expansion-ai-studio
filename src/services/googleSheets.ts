import { DomainRecord } from '../types';

/**
 * Creates a new Google Spreadsheet and writes the user's domains into it
 */
export async function exportToGoogleSheets(
  accessToken: string,
  domains: DomainRecord[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const dateStr = new Date().toISOString().split('T')[0];
  const title = `Domain Expansion - Export ${dateStr}`;

  // 1. Create empty spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${err}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Prepare header and rows
  const headers = [
    'Domain Name',
    'Registrar',
    'Ownership',
    'Status',
    'Renewal Intention',
    'Renewal Date',
    'Renewal Cost',
    'Currency',
    'Auto Renew',
    'Registration Date',
    'Notes',
    'Last Updated',
  ];

  const rows = domains.map((d) => [
    d.name,
    d.registrar || '',
    d.ownership,
    d.status,
    d.renewalIntention,
    d.renewalDate,
    d.cost !== null && d.cost !== undefined ? d.cost : '',
    d.currency,
    d.autoRenew ? 'Yes' : 'No',
    d.registrationDate || '',
    d.notes || '',
    d.updatedAt || '',
  ]);

  const values = [headers, ...rows];

  // 3. Append data to sheet
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`;
  const appendRes = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!appendRes.ok) {
    const err = await appendRes.text();
    throw new Error(`Failed to populate spreadsheet rows: ${err}`);
  }

  return { spreadsheetId, spreadsheetUrl };
}
