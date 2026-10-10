import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { publishLogBatches } from 'src/nats/producer';
import { clickHouse } from 'src/clickhouse/client';
import { addClient } from 'src/sse/sseRegistry';
import { LRUCache } from 'lru-cache';
import { MAX_LIMIT, PlanTier } from 'src/configs';
import type { ParsedQs } from 'qs';

const queryCoolDown = new LRUCache<string, number>({ max: 50_000 });
const result = new LRUCache<
  string,
  { rows: any[]; totalCount: number; ts: number }
>({ max: 20_000 });

const LOG_BATCH_LIMITS = {
  free: { maxLogs: 100, maxBytes: 100_000 },
  starter: { maxLogs: 500, maxBytes: 500_000 },
  pro: { maxLogs: 2000, maxBytes: 1_500_000 },
  business: { maxLogs: 5000, maxBytes: 2_000_000 },
};

// shape of the raw log entries the client sends in the request body
export interface RawLog {
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
  timestamps?: { eventTime?: string | number };
}

export interface SendLogsBody {
  logs: RawLog[];
}

// augments Express's Request with the `user` your auth middleware attaches
interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Injectable()
export class LogsService {
  async sendLogs(
    body: SendLogsBody,
    keyId: string,
    user_id: string,
    plan: PlanTier,
    contentLength: number,
  ) {
    const logs = body?.logs;
    if (!Array.isArray(logs) || logs.length === 0) {
      throw new BadRequestException('logs must be a non-empty array');
    }
    const limits = LOG_BATCH_LIMITS[plan] ?? LOG_BATCH_LIMITS[PlanTier.FREE];
    if (logs.length > limits.maxLogs) {
      throw new PayloadTooLargeException(
        `Max ${limits.maxLogs} logs per request on your plan`,
      );
    }
    // Content-Length instead of re-serializing; the parser limit in main.ts is the hard ceiling
    if (contentLength > limits.maxBytes) {
      throw new PayloadTooLargeException(
        `Max ${limits.maxBytes} bytes per request on your plan`,
      );
    }
    await publishLogBatches(keyId, logs, Date.now(), user_id);
    return { message: 'ok' };
  }

  async startSSE(req: AuthenticatedRequest, res: Response) {
    const userId = req.user.id;
    const limit = Number(req.query.limit) || 500;
    const type = req.query.type as string | undefined;
    const env = req.query.env as string | undefined;
    const appName = req.query.appName as string | undefined;
    const search = req.query.search as string | undefined;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const conditions = [`user_id = {userId:String}`];
    if (type) conditions.push(`type = {type:String}`);
    if (env) conditions.push(`environment = {env:String}`);
    if (appName) conditions.push(`appName = {appName:String}`);
    if (search) conditions.push(`message ILIKE {search:String}`);

    const query = `SELECT * FROM logs.events WHERE ${conditions.join(' AND ')} ORDER BY timestamp DESC LIMIT {limit:UInt32}`;

    const query_params: Record<string, string | number> = { userId, limit };
    if (type) query_params.type = type;
    if (env) query_params.env = env;
    if (appName) query_params.appName = appName;
    if (search) query_params.search = `%${search}%`;

    const rs = await clickHouse.query({
      query,
      format: 'JSONEachRow',
      query_params,
    });
    const initialRows = await rs.json();

    res.write(
      `data: ${JSON.stringify({ type: 'initial', logs: [...initialRows].reverse() })}\n\n`,
    );

    const unsubscribe = addClient(res, { userId, type, env, appName, search });

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  }

  private parseFilters(queryObj: ParsedQs) {
    const filters: {
      limit?: number;
      type?: string;
      env?: string;
      appName?: string;
      search?: string;
      range?: string;
      from?: string;
      to?: string;
    } = {};
    const raw = typeof queryObj.query === 'string' ? queryObj.query : '';

    const parts = raw.split(/[&,\s]+/);
    for (const p of parts) {
      const [k, v] = p.split(':');
      if (!k || v === undefined) continue;
      const key = k.trim();
      const val = v.trim();
      if (key === 'type') filters.type = val;
      else if (key === 'env' || key === 'environment') filters.env = val;
      else if (key === 'appName') filters.appName = val;
      else if (key === 'search') filters.search = val;
      else if (key === 'range') filters.range = val;
      else if (key === 'from') filters.from = val;
      else if (key === 'to') filters.to = val;
      else if (key === 'limit') filters.limit = Number(val);
    }
    if (typeof queryObj.type === 'string') filters.type = queryObj.type;
    if (typeof queryObj.env === 'string') filters.env = queryObj.env;
    if (typeof queryObj.appName === 'string')
      filters.appName = queryObj.appName;
    if (typeof queryObj.search === 'string') filters.search = queryObj.search;
    if (typeof queryObj.range === 'string') filters.range = queryObj.range;
    if (typeof queryObj.from === 'string') filters.from = queryObj.from;
    if (typeof queryObj.to === 'string') filters.to = queryObj.to;
    if (typeof queryObj.limit === 'string')
      filters.limit = Number(queryObj.limit);
    return filters;
  }

  private buildCacheKey(userId: string, filters: any) {
    return `${userId}:${JSON.stringify(filters)}`;
  }

  private isCoolingDown(userId: string) {
    const now = Date.now();
    const last = queryCoolDown.get(userId);
    if (last && now - last < 2000) return true;
    queryCoolDown.set(userId, now);
    return false;
  }

  async getLogs(req: AuthenticatedRequest) {
    const userId = req.user.id;
    const parsed = this.parseFilters(req.query);

    let limit = parsed.limit ?? 100;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    if (limit < 1) limit = 1;

    let timestampfrom: number | undefined;
    let timestampto: number | undefined;

    if (parsed.range) {
      const match = parsed.range.match(/^(\d+)([smhd])$/);
      if (match) {
        const value = Number(match[1]);
        const unit = match[2] as 's' | 'm' | 'h' | 'd';
        const nowSec = Math.floor(Date.now() / 1000);
        const seconds = {
          s: value,
          m: value * 60,
          h: value * 3600,
          d: value * 86400,
        }[unit];
        timestampfrom = nowSec - seconds;
        timestampto = nowSec; // fixed: was `timestamps = nowSec`
      }
    }
    if (parsed.from) {
      const f = Number(parsed.from);
      timestampfrom = f > 2e12 ? Math.floor(f / 1000) : f;
    }
    if (parsed.to) {
      const t = Number(parsed.to);
      timestampto = t > 2e12 ? Math.floor(t / 1000) : t;
    }
    if (!timestampfrom || !timestampto) {
      const nowsec = Math.floor(Date.now() / 1000);
      timestampto = nowsec;
      timestampfrom = nowsec - 20 * 86400;
    }

    const { type, env, appName, search } = parsed;
    const filters = {
      limit,
      type,
      env,
      appName,
      search,
      timestampfrom,
      timestampto,
    };
    const cacheKey = this.buildCacheKey(userId, filters); // fixed: single cache key used everywhere below

    if (this.isCoolingDown(userId)) {
      const fallback = result.get(cacheKey); // fixed: was keyed on `parsed`, now matches storage key
      if (fallback) {
        return {
          fallback: true,
          cached: true,
          count: fallback.rows.length,
          totalcount: fallback.totalCount,
          logs: fallback.rows,
        };
      }
    }

    const cached = result.get(cacheKey);
    if (cached && Date.now() - cached.ts < 1000) {
      return {
        cached: true,
        count: cached.rows.length,
        totalcount: cached.totalCount,
        logs: cached.rows,
      };
    }

    const where = [`user_id = {userId:String}`]; // fixed: column name + closing brace
    if (timestampfrom) where.push(`timestamp >= {from:UInt32}`);
    if (timestampto) where.push(`timestamp <= {to:UInt32}`);
    if (type) where.push(`type = {type:String}`);
    if (env) where.push(`environment = {env:String}`); // fixed: was missing
    if (appName) where.push(`appName = {appName:String}`);
    if (search) where.push(`message ILIKE {search:String}`);

    const queryLogs = `
    SELECT * FROM logs.events
    WHERE ${where.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT {limit:UInt32}
  `;

    const nowSec = Math.floor(Date.now() / 1000);
    const from24h = nowSec - 24 * 60 * 60;
    const to24h = nowSec;
    const where24h = [`user_id = {userId:String}`]; // fixed: column name
    where24h.push(`timestamp >= {from24h:UInt32}`);
    where24h.push(`timestamp <= {to24h:UInt32}`); // fixed: was where24.push(...)

    const querycount = `
    SELECT count(*) AS total FROM logs.events
    WHERE ${where24h.join(' AND ')}
  `;

    const [rsLogs, rsCount] = await Promise.all([
      clickHouse.query({
        query: queryLogs,
        format: 'JSONEachRow',
        query_params: {
          userId,
          limit,
          from: timestampfrom,
          to: timestampto,
          type,
          env,
          appName,
          search: search ? `%${search}%` : undefined,
        },
      }),
      clickHouse.query({
        query: querycount,
        format: 'JSONEachRow',
        query_params: { userId, from24h, to24h },
      }),
    ]);

    const rows = await rsLogs.json<Record<string, unknown>>();
    const countRows = await rsCount.json<{ total: string | number }>();
    const total = Number(countRows[0]?.total ?? 0);
    result.set(cacheKey, { rows, totalCount: total, ts: Date.now() });

    return {
      count: rows.length,
      totalcount: total,
      logs: rows,
      from: timestampfrom,
      to: timestampto,
    };
  }
}
