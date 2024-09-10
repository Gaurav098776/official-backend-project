// Imports
import 'source-map-support/register';
import * as env from 'dotenv';
import admin from 'firebase-admin';
import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { initializeNumberCodes } from './constants/objects';
import { appEmitter, gIsPROD, puppeteerConfig } from './constants/globals';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SseService } from './utils/sse.service';
import * as compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import puppeteer from 'puppeteer';

env.config();

export class BrowserData {
  static browserInstance = null;
}

async function bootstrap() {
  try {
    const firebaseSecrets = './credentials/firebase_service.json';
    const credential = admin.credential.cert(firebaseSecrets);
    const adminOptions = { credential };
    admin.initializeApp(adminOptions);

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      cors: true,
    });
    const sseService = app.get(SseService);

    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ limit: '100mb', extended: true }));
    app.useGlobalPipes(
      new ValidationPipe({
        exceptionFactory: (errors) => {
          let message = '';
          for (const field in errors[0].constraints) {
            message = errors[0].constraints[field];
            break;
          }
          throw new BadRequestException(message);
        },
      }),
    );

    app.enableCors();

    app.startAllMicroservices();
    app.use(compression());
    app.useStaticAssets('public');
    app.setBaseViewsDir('views');
    app.setViewEngine('hbs');

    app.use('/stream', sseService.sse.init);
    await app.listen(process.env.PORT);
    await initializeNumberCodes();
    if (process.env.MODE != 'DEV')
      BrowserData.browserInstance = await puppeteer.launch(puppeteerConfig);

    if (!gIsPROD) appEmitter.emit('init', app);
  } catch (error) {
    console.log(error);
    //
  }
}

bootstrap();
