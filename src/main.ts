import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useStaticAssets(join(__dirname, '..', 'public'));

    app.setGlobalPrefix('api', {
        exclude: [{ path: 'activate', method: RequestMethod.GET }],
    });

    await app.listen(3000);
}
bootstrap();
