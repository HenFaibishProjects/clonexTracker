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
        origin: ['http://localhost:8080', 'http://localhost:3000', 'https://www.benzotracker.support'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    // ✅ Prefix only API routes — excludes static files
    app.setGlobalPrefix('api');

    await app.listen(process.env.PORT || 3000);
}
bootstrap();
