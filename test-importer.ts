import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { NewsImportService } from './src/news-import/news-import.service';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const importService = app.get(NewsImportService);

  try {
    console.log('Running First Import...');
    const result1 = await importService.importAllNews();
    console.log('First Run Results:', JSON.stringify(result1, null, 2));

    console.log('\nRunning Second Import...');
    const result2 = await importService.importAllNews();
    console.log('Second Run Results:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('\nError during import:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
