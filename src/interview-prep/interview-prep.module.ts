import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewPrepSectionState } from './interview-prep-section-state.entity';
import { InterviewPrepService } from './interview-prep.service';
import { InterviewPrepController } from './interview-prep.controller';

@Module({
    imports: [TypeOrmModule.forFeature([InterviewPrepSectionState])],
    controllers: [InterviewPrepController],
    providers: [InterviewPrepService],
    exports: [InterviewPrepService],
})
export class InterviewPrepModule {}
