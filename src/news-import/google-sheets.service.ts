import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);

  async readRomaniaNews(): Promise<Record<string, string>[]> {
    const sheetId = process.env.ROMANIA_NEWS_SHEET_ID;
    if (!sheetId) {
      throw new Error('ROMANIA_NEWS_SHEET_ID is missing');
    }
    return this.readSheet(sheetId);
  }

  async readTechnologyNews(): Promise<Record<string, string>[]> {
    const sheetId = process.env.TECH_NEWS_SHEET_ID;
    if (!sheetId) {
      throw new Error('TECH_NEWS_SHEET_ID is missing');
    }
    return this.readSheet(sheetId);
  }

  private async readSheet(spreadsheetId: string): Promise<Record<string, string>[]> {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKeyRaw) {
      throw new Error('Google credentials are missing in environment variables.');
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Get the first sheet's name
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title;

      if (!sheetName) {
        throw new Error('Could not find any sheets in the spreadsheet.');
      }

      // Read all data from the first sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const result: Record<string, string>[] = [];

      // Process subsequent rows
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Ignore completely empty rows
        if (!row || row.every((cell) => !cell || cell.toString().trim() === '')) {
          continue;
        }

        const rowObject: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          if (header) { // only use valid headers
            rowObject[header] = row[j] ? row[j].toString() : '';
          }
        }
        result.push(rowObject);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Failed to read spreadsheet ${spreadsheetId}: ${error.message}`);
      throw new Error(`Google Sheets reading failed: ${error.message}`);
    }
  }
}
