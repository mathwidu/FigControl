import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
    'http://localhost:3000'
  ];

  app.set('trust proxy', 1);
  app.use(
    (
      _request: unknown,
      response: { setHeader: (name: string, value: string) => void },
      next: () => void
    ) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('X-Frame-Options', 'DENY');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      next();
    }
  );
  app.enableCors({
    origin: corsOrigin,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true
    })
  );

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
