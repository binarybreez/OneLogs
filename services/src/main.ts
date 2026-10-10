import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { createLogsTable } from './clickhouse/schema';
import { startLogsConsumer } from './nats/consumer';
import { initNatsStream } from './nats/initStream';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });

  await createLogsTable();
  await initNatsStream();
  void startLogsConsumer().catch((error) => {
    console.error(`OL logs consumer failed to start`, error);
  });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();
