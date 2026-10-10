import { createClient } from '@clickhouse/client';

const requiredEnvVars = {
  CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
  CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
  CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
  CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE,
};

const missingVars = Object.entries(requiredEnvVars)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required ClickHouse env vars: ${missingVars.join(', ')}`,
    );
  }
  console.warn(
    `Missing ClickHouse env vars (using dev defaults): ${missingVars.join(', ')}`,
  );
}

export const clickHouse = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || 'password',
  database: process.env.CLICKHOUSE_DATABASE || 'logs',
});
