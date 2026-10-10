import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';
import type { RequestLogRecord } from './types';

/** OneLog wire format (POST /logs, see contracts.ts). Extra request facts ride in track/metrics. */
function toOneLogEntry(r: RequestLogRecord) {
  return {
    type: r.status >= 500 ? 'error' : r.status >= 400 ? 'warning' : 'info',
    message: `${r.method} ${r.path} ${r.status}`,
    service: 'lab-api',
    appName: config.oneLog.appName,
    environment: config.oneLog.environment,
    operation: `${r.method} ${r.path}`,
    track: {
      user_id: r.user_id ?? undefined,
      ip: r.ip,
      user_agent: r.user_agent ?? undefined,
      owner_id: r.owner_id,
      token_hash: r.token_hash,
      request_id: r.request_id,
      ts_ms: Date.parse(r.ts), // ClickHouse `timestamp` is second-resolution; this keeps the milliseconds
    },
    security:
      r.status === 401
        ? { auth_status: 'failed' }
        : r.user_id
          ? { auth_status: 'success' }
          : undefined,
    metrics: {
      latency_ms: r.latency_ms,
      db_query_count: 0,
      status: r.status,
      response_bytes: r.response_bytes,
    },
    timestamps: { event_time: r.ts },
  };
}

export class LogSink {
  private readonly file: fs.WriteStream;
  private buffer: ReturnType<typeof toOneLogEntry>[] = [];
  private timer: NodeJS.Timeout | null = null;
  private chain: Promise<void> = Promise.resolve();
  private readonly shipping = Boolean(config.oneLog.apiKey);

  constructor() {
    fs.mkdirSync(config.logsDir, { recursive: true });
    this.file = fs.createWriteStream(
      path.join(config.logsDir, 'requests.jsonl'),
      { flags: 'a' },
    );
  }

  write(rec: RequestLogRecord) {
    this.file.write(JSON.stringify(rec) + '\n');
    if (!this.shipping) return;
    this.buffer.push(toOneLogEntry(rec));
    if (this.buffer.length >= 200) void this.flush();
    else if (!this.timer)
      this.timer = setTimeout(() => void this.flush(), 1000);
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.buffer.length) {
      const batch = this.buffer.splice(0, 500); // POST /logs accepts 1..500 entries
      this.chain = this.chain.then(() => this.post(batch));
    }
    await this.chain;
  }

  private async post(batch: ReturnType<typeof toOneLogEntry>[]) {
    try {
      const res = await fetch(`${config.oneLog.url}/logs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.oneLog.apiKey,
        },
        body: JSON.stringify({ logs: batch }),
      });
      if (!res.ok)
        console.error(
          `[lab] OneLog rejected a batch (${res.status}); dropped ${batch.length} entries`,
        );
    } catch (e) {
      console.error('[lab] OneLog unreachable:', (e as Error).message);
    }
  }

  async close() {
    await this.flush();
    await new Promise<void>((resolve) => this.file.end(() => resolve()));
  }
}
