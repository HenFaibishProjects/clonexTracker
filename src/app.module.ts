import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BenzosEntry } from './benzos.entity';
import { BenzosController } from './benzos.controller';
import { BenzosService } from './benzos.service';
import * as dotenv from 'dotenv';
import {User} from "./auth/user.entity";
import {AuthModule} from "./auth/auth.module";
import {ContactController} from "./contactMe/contact.controller";
import {ContactService} from "./contactMe/contact.service";
import {MailService} from "./auth/mail.service";
import {AccessToken} from "./access-token.entity";
import {TokenController} from "./token.controller";
import {LearningProgressController} from "./progress.controller";
import {LearningProgress} from "./learning-progress.entity";
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
        TypeOrmModule.forFeature([BenzosEntry, User, AccessToken, LearningProgress]),
    ],
    controllers: [AppController, BenzosController, ContactController, TokenController, LearningProgressController],
    providers: [AppService, BenzosService, ContactService, MailService],
})

export class AppModule {}
