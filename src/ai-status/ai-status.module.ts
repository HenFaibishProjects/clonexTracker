import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { AiStatusCheck } from './entities/ai-status-check.entity';
import { AiStatusService } from './ai-status.service';
import { AiStatusScheduler } from './ai-status.scheduler';
import { AiStatusController } from './ai-status.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiStatusCheck]),
    HttpModule,
  ],
  providers: [AiStatusService, AiStatusScheduler],
  controllers: [AiStatusController],
})
export class AiStatusModule {}