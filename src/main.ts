import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import { SupabaseExceptionFilter } from './common/filters/supabase-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // Create uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory at:', uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Hide X-Powered-By header for security reasons
  app.disable('x-powered-by');

  // Use cookie parser
  app.use(cookieParser());

  // Configure global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Register global exception filter for graceful error handling
  app.useGlobalFilters(new SupabaseExceptionFilter());

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Sofa Deal E-Commerce API')
    .setDescription('API documentation for Sofa Deal E-Commerce platform')
    .setVersion('1.0')
    .addTag('App', 'General application endpoints')
    .addTag('Categories', 'Product category management')
    .addTag('Auth', 'Authentication endpoints using Supabase')
    .addTag('Orders & Checkout', 'Order processing and management')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Configure CORS
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_BASE_URL || '*'
        : '*',
    // : [
    //     'http://localhost:4000',
    //     'http://localhost:5173',
    //     'https://sofa-deal.netlify.app',
    //     'http://localhost:3000',
    //     'https://frontend-dev-tau-hazel.vercel.app',
    //   ],
    credentials: true,
  });

  // Setup Swagger documentation
  SwaggerModule.setup('api-docs', app, document);

  // Start the server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger documentation available at: ${await app.getUrl()}/api-docs`,
  );
}

bootstrap();
