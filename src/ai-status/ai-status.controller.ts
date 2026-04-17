import { Controller, Get, Query } from '@nestjs/common';
import { AiStatusService } from './ai-status.service';

@Controller('ai-status')
export class AiStatusController {
  constructor(private readonly aiStatusService: AiStatusService) {}

  @Get('latest')
  getLatest() {
    return this.aiStatusService.getLatest();
  }

  @Get('history')
  getHistory(@Query('days') days = '30') {
    return this.aiStatusService.getHistory(Number(days));
  }
}