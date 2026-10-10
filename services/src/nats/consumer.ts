import { consumerOpts, ConsumerInfo } from 'nats';
import { getNats } from '.';
import Redis from 'ioredis';
import { clickHouse } from 'src/clickhouse/client';
import { broadcastLogs } from 'src/sse/sseRegistry';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
  maxRetriesPerRequest: 5,
  reconnectOnError: (err) => err.message.includes('READONLY'),
  retryStrategy: (times) => Math.min(times * 200, 10000),
});
redis.on('error', (err) => console.error('Redis error in consumer:', err));

const MAX_DELIVERIES = 5;
let lastBacklogUpdate = 0;

const importanceMap: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function toImportance(input: unknown): number | null {
  if (typeof input === 'number') return input;
  if (typeof input === 'string')
    return importanceMap[input.toLowerCase()] ?? null;
  return null;
}

interface RawLog {
  type: string;
  message: string;
  service?: string;
  appName?: string;
  environment?: string;
  importance?: string | number;
  subsystem?: string;
  operation?: string;
  track?: unknown;
  security?: unknown;
  metrics?: unknown;
  // the SDK sends snake_case (event_time); camelCase is accepted for older clients
  timestamps?: { event_time?: string | number; eventTime?: string | number };
}

interface IngestMessage {
  keyId: string;
  user_id: string;
  logs: RawLog[];
  serverRecievedAt: number;
  timestamp: number;
}

function toEpochSeconds(log: RawLog, fallbackMs: number): number {
  const raw = log.timestamps?.event_time ?? log.timestamps?.eventTime;
  if (raw === undefined || raw === null || raw === '')
    return Math.floor(fallbackMs / 1000);
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms)
    ? Math.floor(ms / 1000)
    : Math.floor(fallbackMs / 1000);
}

export async function startLogsConsumer() {
  const { jc, nc } = await getNats();
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();
  const durable = 'ol-log-worker';
  const streamName = 'OL_LOGS';
  const subject = 'logs.ingest';

  const opts = consumerOpts();
  opts.durable(durable);
  opts.manualAck();
  opts.ackExplicit();
  opts.deliverTo('ol-log-worker');

  try {
    const existing: ConsumerInfo = await jsm.consumers.info(
      streamName,
      durable,
    );
    if (!existing.config.deliver_subject) {
      console.warn(
        `Durable ${durable} is pull-based, recreating as push consumer`,
      );
      await jsm.consumers.delete(streamName, durable);
    }
  } catch {
    // no existing consumer, subscribe() below creates it
  }

  const sub = await js.subscribe(subject, opts);
  console.log('OL Logs consumer started');

  for await (const msg of sub) {
    let data: IngestMessage;
    try {
      data = jc.decode(msg.data) as IngestMessage;
    } catch (err) {
      console.error('Malformed NATS message, dropping permanently:', err);
      msg.term();
      continue;
    }

    const { keyId, user_id, logs, serverRecievedAt } = data;
    if (!user_id || !Array.isArray(logs) || logs.length === 0) {
      console.error(
        `Invalid message for keyId ${keyId} (no user_id or empty/non-array logs), dropping`,
      );
      msg.term();
      continue;
    }

    const now = Date.now();
    const transformed = logs.map((log) => ({
      keyId,
      user_id,
      type: log.type,
      message: log.message,
      service: log.service ?? null,
      appName: log.appName ?? 'default',
      environment: log.environment ?? 'development',
      importance: toImportance(log.importance),
      subsystem: log.subsystem ?? null,
      operation: log.operation ?? null,
      track: log.track ? JSON.stringify(log.track) : null,
      security: log.security ? JSON.stringify(log.security) : null,
      metrics: log.metrics ? JSON.stringify(log.metrics) : null,
      timestamp: toEpochSeconds(log, now), // column is `timestamp`, not `timestamps`
    }));

    try {
      await clickHouse.insert({
        table: 'logs.events',
        values: transformed,
        format: 'JSONEachRow',
      });
    } catch (error) {
      const deliveries = msg.info.redeliveryCount;
      if (deliveries >= MAX_DELIVERIES) {
        console.error(
          `Insert failed ${deliveries} times, dropping batch for keyId ${keyId}:`,
          error,
        );
        msg.term();
      } else {
        console.error(
          `ClickHouse insert failed (delivery ${deliveries}), will retry:`,
          error,
        );
        msg.nak();
      }
      continue;
    }

    // data is stored: ack now so nothing below can cause a redelivery and duplicate rows
    msg.ack();

    try {
      broadcastLogs(transformed);

      // one latency sample per batch, not one per log
      redis
        .multi()
        .lpush('ingest:latency', now - serverRecievedAt)
        .ltrim('ingest:latency', 0, 59)
        .exec()
        .catch((err) => console.error('Latency write failed:', err));

      if (now - lastBacklogUpdate > 1000) {
        lastBacklogUpdate = now;
        const info: ConsumerInfo = await jsm.consumers.info(
          streamName,
          durable,
        );
        await redis.set(
          'ingest:backlog',
          info.num_pending ?? info.num_ack_pending ?? 0,
        );
      }
    } catch (err) {
      console.error('Post-ack step failed (data already stored):', err);
    }
  }
}
