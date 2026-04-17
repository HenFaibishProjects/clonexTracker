import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AiStatusService } from './ai-status.service';

@Injectable()
export class AiStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(AiStatusScheduler.name);

  constructor(private readonly aiStatusService: AiStatusService) {}

  async onModuleInit() {
    this.logger.log('Running initial AI status check on startup...');
    await this.aiStatusService.checkAndStoreAll();
  }

  @Cron('0 * * * *')
  async handleHourlyCheck() {
    await this.aiStatusService.checkAndStoreAll();
  }
}