import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClonexEntry } from './clonex.entity';
import { ClonexController } from './clonex.controller';
import { ClonexService } from './clonex.service';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            synchronize: true,
            autoLoadEntities: true,
        }),
        TypeOrmModule.forFeature([ClonexEntry]),
    ],
    controllers: [AppController, ClonexController],
    providers: [AppService, ClonexService],
})
export class AppModule {}
