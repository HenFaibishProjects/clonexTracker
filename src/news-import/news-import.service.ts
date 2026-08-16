import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoogleSheetsService } from './google-sheets.service';
import { NewsService } from '../news/news.service';
import { CreateNewsItemDto } from '../news/dto/create-news-item.dto';

interface ImportSummary {
  total: number;
  imported: number;
  skippedExisting: number;
  skippedIncomplete: number;
  failed: number;
}

@Injectable()
export class NewsImportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NewsImportService.name);

  constructor(
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly newsService: NewsService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NEWS_IMPORT_ENABLED !== 'true') {
      this.logger.log('News import disabled: NEWS_IMPORT_ENABLED is not true');
      return;
    }

    try {
      const { romania, technology } = await this.importAllNews();
      this.logger.log(`Startup news import completed:\nRomania: ${romania.imported} imported, ${romania.skippedExisting} existing, ${romania.failed} failed\nTechnology: ${technology.imported} imported, ${technology.skippedExisting} existing, ${technology.failed} failed`);
    } catch (error: any) {
      this.logger.error(`Startup news import failed: ${error.message}`);
    }
  }

  @Cron('30 9,12,15,18,21,0 * * *', {
    timeZone: 'Asia/Jerusalem',
  })
  async handleScheduledImport() {
    if (process.env.NEWS_IMPORT_ENABLED !== 'true') {
      return;
    }

    try {
      const { romania, technology } = await this.importAllNews();
      this.logger.log(`News import completed:\nRomania: ${romania.imported} imported, ${romania.skippedExisting} existing, ${romania.failed} failed\nTechnology: ${technology.imported} imported, ${technology.skippedExisting} existing, ${technology.failed} failed`);
    } catch (error: any) {
      this.logger.error(`Scheduled news import failed: ${error.message}`);
    }
  }

  @Cron('10 6,7,10,13,17 * * *', {
    timeZone: 'Asia/Jerusalem',
  })
  async handleScheduledIsraelImport() {
    if (process.env.NEWS_IMPORT_ENABLED !== 'true') {
      return;
    }

    try {
      const israel = await this.importIsraelNews();
      this.logger.log(`Israel news import completed: ${israel.imported} imported, ${israel.skippedExisting} existing, ${israel.skippedIncomplete} incomplete, ${israel.failed} failed`);
    } catch (error: any) {
      this.logger.error(`Scheduled Israel news import failed: ${error.message}`);
    }
  }

  async importAllNews() {
    const romania = await this.importRomaniaNews();
    const technology = await this.importTechnologyNews();
    return { romania, technology };
  }

  async importRomaniaNews(): Promise<ImportSummary> {
    const summary: ImportSummary = {
      total: 0,
      imported: 0,
      skippedExisting: 0,
      skippedIncomplete: 0,
      failed: 0,
    };

    try {
      const rows = await this.googleSheetsService.readRomaniaNews();
      summary.total = rows.length;
      for (const row of rows) {
        if (!this.isValidRow(row)) {
          summary.skippedIncomplete++;
          continue;
        }

        const dto = this.mapRomaniaRow(row);
        await this.importRow(dto, summary);
      }
    } catch (error: any) {
      this.logger.error(`Failed to import Romania news: ${error.message}`);
    }

    return summary;
  }

  async importTechnologyNews(): Promise<ImportSummary> {
    const summary: ImportSummary = {
      total: 0,
      imported: 0,
      skippedExisting: 0,
      skippedIncomplete: 0,
      failed: 0,
    };

    try {
      const rows = await this.googleSheetsService.readTechnologyNews();
      summary.total = rows.length;
      for (const row of rows) {
        if (!this.isValidRow(row)) {
          summary.skippedIncomplete++;
          continue;
        }

        const dto = this.mapTechnologyRow(row);
        await this.importRow(dto, summary);
      }
    } catch (error: any) {
      this.logger.error(`Failed to import Technology news: ${error.message}`);
    }

    return summary;
  }

  async importIsraelNews(): Promise<ImportSummary> {
    const summary: ImportSummary = {
      total: 0,
      imported: 0,
      skippedExisting: 0,
      skippedIncomplete: 0,
      failed: 0,
    };

    try {
      const rows = await this.googleSheetsService.readIsraelNews();
      summary.total = rows.length;
      for (const row of rows) {
        if (!this.isValidRow(row)) {
          summary.skippedIncomplete++;
          continue;
        }

        const dto = this.mapIsraelRow(row);
        await this.importRow(dto, summary);
      }
    } catch (error: any) {
      this.logger.error(`Failed to import Israel news: ${error.message}`);
    }

    return summary;
  }

  private isValidRow(row: Record<string, string>): boolean {
    const required = [
      'Article URL',
      'Hebrew Title',
      'Hebrew Summary',
      'Source',
      'Publication Date & Time',
    ];
    for (const field of required) {
      if (!row[field] || row[field].trim() === '') {
        return false;
      }
    }
    return true;
  }

  private mapRomaniaRow(row: Record<string, string>): CreateNewsItemDto {
    return {
      feedCode: 'romania',
      titleHe: row['Hebrew Title'].trim(),
      originalTitle: row['Original Romanian Headline']?.trim() || undefined,
      summaryHe: row['Hebrew Summary'].trim(),
      articleHe: row['Hebrew Article']?.trim() || undefined,
      sourceName: row['Source'].trim(),
      sourceUrl: row['Article URL'].trim(),
      category: row['Category']?.trim() || undefined,
      location: row['Location']?.trim() || undefined,
      importanceScore: this.parseScore(row['Importance Score']),
      personalScore: this.parseScore(row['Personal Score']),
      publishedAt: this.parseDate(row['Publication Date & Time']),
      displayWeekStart: this.getDisplayWeekStart(row['Publication Date & Time']),
      topicCodes: this.parseTopicCodes(row['Topic Codes']),
    };
  }

  private mapTechnologyRow(row: Record<string, string>): CreateNewsItemDto {
    return {
      feedCode: 'technology',
      titleHe: row['Hebrew Title'].trim(),
      originalTitle: row['Original English Headline']?.trim() || undefined,
      summaryHe: row['Hebrew Summary'].trim(),
      articleHe: row['Hebrew Article']?.trim() || undefined,
      sourceName: row['Source'].trim(),
      sourceUrl: row['Article URL'].trim(),
      category: row['Category']?.trim() || undefined,
      companyTopic: row['Company / Topic']?.trim() || undefined,
      importanceScore: this.parseScore(row['Importance Score']),
      personalScore: this.parseScore(row['Personal Score']),
      publishedAt: this.parseDate(row['Publication Date & Time']),
      displayWeekStart: this.getDisplayWeekStart(row['Publication Date & Time']),
      topicCodes: this.parseTopicCodes(row['Topic Codes']),
    };
  }

  private mapIsraelRow(row: Record<string, string>): CreateNewsItemDto {
    return {
      feedCode: 'israel',
      titleHe: row['Hebrew Title'].trim(),
      originalTitle: row['Original Hebrew Headline']?.trim() || undefined,
      summaryHe: row['Hebrew Summary'].trim(),
      articleHe: row['Hebrew Article']?.trim() || undefined,
      sourceName: row['Source'].trim(),
      sourceUrl: row['Article URL'].trim(),
      category: row['Category']?.trim() || undefined,
      location: row['Location']?.trim() || 'Israel',
      importanceScore: this.parseScore(row['Importance Score']),
      personalScore: this.parseScore(row['Personal Score']),
      publishedAt: this.parseDate(row['Publication Date & Time']),
      displayWeekStart: this.getDisplayWeekStart(row['Publication Date & Time']),
      topicCodes: this.parseTopicCodes(row['Topic Codes']),
    };
  }

  private parseScore(scoreStr: string | undefined): number | undefined {
    if (!scoreStr) return undefined;
    const score = parseInt(scoreStr.trim(), 10);
    if (isNaN(score) || score < 1 || score > 5) {
      return undefined;
    }
    return score;
  }

  private parseDate(dateStr: string): string {
    const date = new Date(dateStr.trim());
    if (isNaN(date.getTime())) {
      return new Date().toISOString(); // Fallback if strictly needed, but validation passed.
    }
    return date.toISOString();
  }

  private getDisplayWeekStart(dateStr: string): string {
    const date = new Date(dateStr.trim());
    if (isNaN(date.getTime())) {
      date.setTime(Date.now());
    }
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
  }

  private parseTopicCodes(codesStr: string | undefined): string[] | undefined {
    if (!codesStr || codesStr.trim() === '') return undefined;
    const codes = codesStr
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    return codes.length > 0 ? codes : undefined;
  }

  private async importRow(dto: CreateNewsItemDto, summary: ImportSummary) {
    try {
      await this.newsService.create(dto);
      summary.imported++;
    } catch (error: any) {
      // Handle PostgreSQL unique constraint violation
      // Error code 23505 is PostgreSQL unique_violation
      if (error?.code === '23505' || error?.message?.includes('duplicate key value') || error?.message?.includes('Unique constraint')) {
        summary.skippedExisting++;
      } else {
        this.logger.error(`Failed to import row (URL: ${dto.sourceUrl}): ${error.message}`);
        summary.failed++;
      }
    }
  }
}
