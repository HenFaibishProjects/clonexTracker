import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import express from 'express';
import {AppModule} from "./src/app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(express.static(join(__dirname, '..', 'public')));
    await app.listen(3000);
}
bootstrap();