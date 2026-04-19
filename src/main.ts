import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // ✅ Serve static files from /public
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // ✅ CORS: allow frontend + deployed domain
    const allowedOrigins = [
        'https://www.lidasoftware.online',
        'https://lidasoftware.online',
        'https://www.benzotracker.support',
        'https://benzotracker.support',
        'http://localhost:3000',
        'http://localhost:4200',
        'http://127.0.0.1:5500'
    ];
    app.enableCors({
        origin: (requestOrigin, callback) => {
            if (!requestOrigin) return callback(null, true);
            if (allowedOrigins.includes(requestOrigin)) {
                callback(null, true);
            } else {
                // Return 'false' instead of throwing Error to prevent a 500 Internal Server Error response
                callback(null, false);
            }
        },
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
