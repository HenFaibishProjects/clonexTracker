import { Module } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { NewsImportService } from './news-import.service';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [NewsModule],
  providers: [GoogleSheetsService, NewsImportService],
  exports: [GoogleSheetsService, NewsImportService],
})
export class NewsImportModule {}
