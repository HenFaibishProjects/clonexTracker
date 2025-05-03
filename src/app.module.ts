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
            type: 'mysql',
            host: 'clonextrackerhost',
            port: 3306,
            username: 'ClonexTracker',
            password: 'Zoomaccount1!',
            database: 'clonex',
            entities: [ClonexEntry],
            synchronize: true,
        }),
        TypeOrmModule.forFeature([ClonexEntry])],
    controllers: [AppController, ClonexController],
    providers: [AppService, ClonexService],
})
export class AppModule {}
