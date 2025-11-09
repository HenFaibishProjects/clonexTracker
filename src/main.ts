import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // ✅ Serve static files from /public
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // ✅ CORS: allow frontend + deployed domain
    app.enableCors({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
    });

    app.useStaticAssets(join(__dirname, '..', 'public'));

    // ✅ Prefix only API routes — excludes static files
    app.setGlobalPrefix('api');

    await app.listen(process.env.PORT || 3000);
}
bootstrap();
