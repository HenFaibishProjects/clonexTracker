import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AiStatusService } from './ai-status.service';

@Injectable()
export class AiStatusScheduler implements OnModuleInit {
  private readonly logger = new Logger(AiStatusScheduler.name);

  constructor(private readonly aiStatusService: AiStatusService) {}

  onModuleInit() {
    // Fire-and-forget: do NOT await here.
    // If the DB table doesn't exist yet, this must NOT block or crash the bootstrap.
    this.aiStatusService.checkAndStoreAll().catch((err) => {
      this.logger.error(`Initial AI status check failed (non-fatal): ${err?.message ?? err}`);
    });
  }

  @Cron('0 * * * *')
  async handleHourlyCheck() {
    await this.aiStatusService.checkAndStoreAll();
  }
}