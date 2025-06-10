import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useStaticAssets(join(__dirname, '..', 'public'));

    app.enableCors({
        origin: 'http://localhost:8080', // Allow frontend server
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true               // Allow cookies/headers if used
    });

    app.setGlobalPrefix('api', {
        exclude: [{ path: 'auth/activate', method: RequestMethod.GET }],
    });

    app.enableCors({
        origin: ['http://localhost:8080', 'http://localhost:3000', 'https://www.benzotracker.support'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true
    });

    app.use('/',
        express.static(join(__dirname, '..', 'public'))
    );


    await app.listen(3000);
}
bootstrap();
