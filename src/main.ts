import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as admin from 'firebase-admin';
import { HttpExceptionFilter, ResponseInterceptor } from '@common';
import { AppModule } from '@/app.module';
import { readFirebaseServiceAccount } from '@/config/firebase-admin';

async function bootstrap() {
  const apiPrefix = process.env.API_PREFIX ?? 'v1/user';
  const docsPath = process.env.API_DOCS_PATH ?? 'v1/user/docs';

  if (!admin.apps.length) {
    const firebaseCredential = readFirebaseServiceAccount();

    admin.initializeApp(
      firebaseCredential
        ? {
            credential: admin.credential.cert({
              projectId: firebaseCredential.serviceAccount.project_id,
              clientEmail: firebaseCredential.serviceAccount.client_email,
              privateKey: firebaseCredential.serviceAccount.private_key,
            }),
          }
        : undefined,
    );

    console.log(
      firebaseCredential
        ? `Firebase Admin SDK initialized from ${firebaseCredential.source}`
        : 'Firebase Admin SDK initialized with application default credentials',
    );
  }

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  ) ?? ['*'];
  app.enableCors({ origin: corsOrigins, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BeeFriends - User Service')
    .setDescription('API documentation for BeeFriends User Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(docsPath, app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`User Service running on http://localhost:${port}`);
  console.log(`API prefix     http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger docs   http://localhost:${port}/${docsPath}`);
}

void bootstrap();
