import { GoogleSheetsService } from './src/news-import/google-sheets.service';
import 'dotenv/config';

async function bootstrap() {
  const sheetsService = new GoogleSheetsService();

  try {
    console.log('Testing Romania News...');
    const romaniaRows = await sheetsService.readRomaniaNews();
    console.log(`Romania News rows read: ${romaniaRows.length}`);
    if (romaniaRows.length > 0) {
      console.log('Romania Headers:', Object.keys(romaniaRows[0]));
      console.log('Romania Sample Row 1:', romaniaRows[0]);
    }

    console.log('\nTesting Technology News...');
    const techRows = await sheetsService.readTechnologyNews();
    console.log(`Technology News rows read: ${techRows.length}`);
    if (techRows.length > 0) {
      console.log('Technology Headers:', Object.keys(techRows[0]));
      console.log('Technology Sample Row 1:', techRows[0]);
    }

    console.log('\nSuccess! Both sheets read properly.');
  } catch (error) {
    console.error('\nError:', error);
  }
}

bootstrap();
