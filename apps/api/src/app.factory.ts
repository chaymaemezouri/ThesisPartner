import { VersioningType, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, urlencoded, type Request } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/http/request-context';
import { loadRootEnv } from './config/load-env';
import { ENV, type Env } from './config/env';

export async function createApp(): Promise<INestApplication> {
  loadRootEnv();
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: false,
  });
  configureApp(app, app.get<Env>(ENV));
  return app;
}

export function configureApp(app: INestApplication, env: Env): void {
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());
  app.use(
    json({
      limit: '256kb',
      verify: (request, _response, buffer) => {
        (request as Request).rawBody = buffer;
      },
    }),
  );
  app.use(urlencoded({ extended: false, limit: '256kb' }));
  app.enableCors({
    origin: env.APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Request-Id', 'X-CSRF-Token'],
    maxAge: 600,
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  if (env.TRUST_PROXY) {
    const http = app.getHttpAdapter().getInstance() as {
      set: (key: string, value: number) => void;
    };
    http.set('trust proxy', 1);
  }

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Thesis Flow API')
      .setDescription('API HTTP versionnée de Thesis Flow.')
      .setVersion('1.0')
      .addCookieAuth('tp_session')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  app.enableShutdownHooks();
}
