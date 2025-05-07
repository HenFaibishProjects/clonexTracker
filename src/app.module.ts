import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClonexEntry } from './clonex.entity';
import { ClonexController } from './clonex.controller';
import { ClonexService } from './clonex.service';
import * as dotenv from 'dotenv';
import {User} from "./auth/user.entity";
import {AuthModule} from "./auth/auth.module";
dotenv.config();

@Module({
    imports: [
        AuthModule,
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            autoLoadEntities: true,
            synchronize: true,
        }),
        TypeOrmModule.forFeature([ClonexEntry, User]),
    ],
    controllers: [AppController, ClonexController],
    providers: [AppService, ClonexService],
})

export class AppModule {}
