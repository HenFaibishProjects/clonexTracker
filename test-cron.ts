import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('App loaded. Waiting 10 seconds for Cron jobs...');
  await new Promise((resolve) => setTimeout(resolve, 10000));
  await app.close();
}

bootstrap();
