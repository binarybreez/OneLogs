import type { Role } from './data';

/** Per-request identity, filled by the logging middleware and refined by handlers. */
export interface LabContext {
  user_id: string | null; // the caller (null = anonymous / invalid token / failed login)
  owner_id: string | null; // owner of the requested object, where applicable
  token_hash: string | null;
  role: Role | null;
}

/** One line of data/logs/requests.jsonl. This is the detector's input. */
export interface RequestLogRecord {
  ts: string; // ISO 8601, millisecond precision
  request_id: string; // join key for evaluation; carries no label information
  method: string;
  path: string; // raw request target exactly as received, including the query string
  status: number;
  latency_ms: number;
  response_bytes: number;
  ip: string;
  token_hash: string | null; // sha256(bearer token) truncated to 16 hex chars
  user_id: string | null;
  owner_id: string | null;
  user_agent: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      lab: LabContext;
    }
  }
}
