
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import {NestFactory} from "@nestjs/core";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Serve static files (frontend later)
    app.useStaticAssets(join(__dirname, '..', 'public'));

    await app.listen(3000);
}
bootstrap();
