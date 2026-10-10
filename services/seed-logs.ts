import { clickHouse } from './src/clickhouse/client';
import { createLogsTable } from './src/clickhouse/schema'; // adjust to wherever createLogsTable lives

// Usage: npx tsx seed-logs.ts [totalRows] [batchSize]
const TOTAL_ROWS = Number(process.argv[2] ?? 100_000);
const BATCH_SIZE = Number(process.argv[3] ?? 10_000);
const DAYS_BACK = 29; // table TTL is 30 days, stay inside it or rows get deleted

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const maybe = <T>(value: () => T, chance = 0.6): T | null =>
  Math.random() < chance ? value() : null;

const uuid = () => crypto.randomUUID();

// "YYYY-MM-DD HH:mm:ss" (UTC), the format ClickHouse DateTime expects
const toCH = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

const KEY_IDS = Array.from({ length: 20 }, () => `key_${uuid().slice(0, 8)}`);
const USER_IDS = Array.from(
  { length: 200 },
  () => `user_${uuid().slice(0, 8)}`,
);

const TYPES = ['info', 'warn', 'error', 'debug', 'audit', 'metric'];
const APPS = ['web-app', 'mobile-api', 'billing', 'auth-service', 'worker'];
const ENVIRONMENTS = ['production', 'staging', 'development'];
const SUBSYSTEMS = ['database', 'cache', 'queue', 'http', 'auth', 'storage'];
const SERVICES = ['users', 'orders', 'payments', 'notifications', 'search'];
const OPERATIONS = [
  'create',
  'read',
  'update',
  'delete',
  'login',
  'logout',
  'sync',
];
const MESSAGES: Record<string, string[]> = {
  info: [
    'Request completed',
    'User session started',
    'Job scheduled',
    'Cache refreshed',
  ],
  warn: [
    'Slow query detected',
    'Retrying request',
    'Rate limit approaching',
    'Deprecated endpoint used',
  ],
  error: [
    'Unhandled exception',
    'Database connection lost',
    'Payment failed',
    'Timeout calling upstream',
  ],
  debug: ['Cache miss', 'Payload parsed', 'Entering handler', 'Config loaded'],
  audit: [
    'Permission changed',
    'API key rotated',
    'User deleted',
    'Password reset requested',
  ],
  metric: [
    'Latency sample',
    'Memory usage sample',
    'Queue depth sample',
    'Throughput sample',
  ],
};

const generateRow = () => {
  const type = pick(TYPES);
  const timestamp = new Date(
    Date.now() - Math.floor(Math.random() * DAYS_BACK * 24 * 60 * 60 * 1000),
  );
  // ingested slightly after the event, but never in the future
  const ingestedAt = new Date(
    Math.min(Date.now(), timestamp.getTime() + randInt(0, 5000)),
  );

  return {
    keyId: pick(KEY_IDS),
    user_id: pick(USER_IDS),
    type,
    message: pick(MESSAGES[type]),
    appName: pick(APPS),
    environment: pick(ENVIRONMENTS),
    importance: maybe(() => randInt(1, 5)),
    subsystem: maybe(() => pick(SUBSYSTEMS)),
    service: maybe(() => pick(SERVICES)),
    operation: maybe(() => pick(OPERATIONS)),
    track: maybe(() =>
      JSON.stringify({ traceId: uuid(), spanId: uuid().slice(0, 16) }),
    ),
    security: maybe(
      () =>
        JSON.stringify({
          ip: `${randInt(1, 254)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
          authenticated: Math.random() > 0.1,
        }),
      0.3,
    ),
    metrics: maybe(
      () =>
        JSON.stringify({
          durationMs: randInt(1, 3000),
          memoryMb: randInt(32, 1024),
          statusCode: pick([200, 200, 200, 201, 400, 404, 500]),
        }),
      0.5,
    ),
    timestamp: toCH(timestamp),
    ingested_at: toCH(ingestedAt),
  };
};

const seed = async () => {
  await createLogsTable();

  console.log(`Inserting ${TOTAL_ROWS} rows in batches of ${BATCH_SIZE}...`);
  const start = Date.now();
  let inserted = 0;

  while (inserted < TOTAL_ROWS) {
    const size = Math.min(BATCH_SIZE, TOTAL_ROWS - inserted);
    const values = Array.from({ length: size }, generateRow);

    await clickHouse.insert({
      table: 'logs.events',
      values,
      format: 'JSONEachRow',
    });

    inserted += size;
    console.log(`  ${inserted}/${TOTAL_ROWS}`);
  }

  const result = await clickHouse.query({
    query: 'SELECT count() AS total FROM logs.events',
    format: 'JSONEachRow',
  });
  const [row] = await result.json<{ total: string }>();

  console.log(
    `Done in ${((Date.now() - start) / 1000).toFixed(1)}s. Table now has ${row.total} rows.`,
  );
};

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => clickHouse.close());
