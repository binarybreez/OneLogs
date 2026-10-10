import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { config } from './config';
import { openApiDocument } from './openapi';
import { requestLogger } from './request-log';
import { LogSink } from './sink';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });

  // lab only: honour X-Forwarded-For so the generator can simulate many client IPs
  app.set('trust proxy', true);

  const sink = new LogSink();
  app.use(requestLogger(sink));

  // the detector's list of documented endpoints
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(config.dataDir, 'openapi.json'),
    JSON.stringify(openApiDocument(), null, 2),
  );

  await app.listen(config.port, config.host); // loopback only: this app is vulnerable on purpose
  console.log(
    `[lab] http://${config.host}:${config.port}  ownership=${config.enforceOwnership ? 'ENFORCED' : 'VULNERABLE'}`,
  );
  console.log(
    `[lab] logs      -> ${path.join(config.logsDir, 'requests.jsonl')}`,
  );
  console.log(
    `[lab] openapi   -> ${path.join(config.dataDir, 'openapi.json')}`,
  );
  console.log(
    `[lab] OneLog    -> ${config.oneLog.apiKey ? config.oneLog.url : 'disabled (no ONELOG_API_KEY)'}`,
  );

  const shutdown = async () => {
    await app.close();
    await sink.close(); // flush file + last OneLog batch
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}
void bootstrap();
