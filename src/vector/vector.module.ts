import { Module } from '@nestjs/common';
import { VectorController } from './vector.controller';
import { VectorService } from './vector.service';
import { VectorRepository } from './vector.repository';

@Module({
    controllers: [VectorController],
    providers: [VectorService, VectorRepository],
    exports: [VectorService],
})
export class VectorModule {}
