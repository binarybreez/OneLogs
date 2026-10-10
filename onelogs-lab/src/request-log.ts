import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { hashToken, resolveToken } from './auth';
import { dataset } from './data';
import type { LogSink } from './sink';
import './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalizeIp = (ip: string | undefined) =>
  (ip ?? '').replace(/^::ffff:/, '') || 'unknown';

/**
 * Registered with app.use() (not as Nest middleware) so it sees EVERY request,
 * including 404s on paths no controller handles. Those are exactly what a path scanner produces.
 */
export function requestLogger(sink: LogSink) {
  return (req: Request, res: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();

    // lab-only: lets the generator replay hours of traffic in seconds with realistic timestamps
    const sim = Number(req.header('x-sim-ts'));
    const tsMs =
      config.allowSimTime && Number.isFinite(sim) && sim > 0 ? sim : Date.now();

    const inbound = req.header('x-request-id');
    const requestId = inbound && UUID.test(inbound) ? inbound : randomUUID();
    res.setHeader('x-request-id', requestId);

    const auth = req.header('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
    const userId = token ? (resolveToken(token) ?? null) : null;
    req.lab = {
      user_id: userId,
      owner_id: null,
      token_hash: token ? hashToken(token) : null,
      role: userId ? (dataset.usersById.get(userId)?.role ?? null) : null,
    };

    res.on('finish', () => {
      sink.write({
        ts: new Date(tsMs).toISOString(),
        request_id: requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        latency_ms:
          Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 10) /
          10,
        response_bytes: Number(res.getHeader('content-length') ?? 0) || 0,
        ip: normalizeIp(req.ip),
        token_hash: req.lab.token_hash,
        user_id: req.lab.user_id,
        owner_id: req.lab.owner_id,
        user_agent: req.header('user-agent') ?? null,
      });
    });
    next();
  };
}
