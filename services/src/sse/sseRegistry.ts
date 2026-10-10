import { Response } from 'express';

export interface Filters {
  userId: string;
  type?: string;
  env?: string;
  appName?: string;
  search?: string;
}

export interface SSEClient {
  res: Response;
  filters: Filters;
}

interface TransformedLog {
  keyId: string;
  user_id: string;
  type: string;
  message: string;
  service: string | null;
  appName: string;
  environment?: string;
  importance: number | null;
  subsystem: string | null;
  operation: string | null;
  track: string | null;
  security: string | null;
  metrics: string | null;
  timestamp: number;
}

const clients: SSEClient[] = []; // renamed from `client` — was misleadingly singular for an array

export function addClient(res: Response, filters: Filters): () => void {
  const entry: SSEClient = { res, filters };
  clients.push(entry);
  // return an unsubscribe fn so the caller doesn't need to know internal removal logic
  return () => removeClient(res);
}

export function removeClient(res: Response) {
  const idx = clients.findIndex((c) => c.res === res);
  if (idx !== -1) {
    clients.splice(idx, 1);
  }
}

export function broadcastLogs(newLogs: TransformedLog[]) {
  const CHUNK_SIZE = 50;
  // iterate backwards so we can safely splice out dead clients mid-loop if needed
  for (const client of [...clients]) {
    const { res, filters } = client;

    const matched = newLogs.filter((log) => {
      if (log.user_id !== filters.userId) return false; // fix: was log.userId
      if (filters.type && log.type !== filters.type) return false;
      if (filters.env && log.environment !== filters.env) return false;
      if (filters.appName && log.appName !== filters.appName) return false;
      if (
        filters.search &&
        !log.message?.toLowerCase().includes(filters.search.toLowerCase()) // fix: was log.messages
      )
        return false;
      return true;
    });

    if (matched.length === 0) continue;

    try {
      for (let i = 0; i < matched.length; i += CHUNK_SIZE) {
        const slice = matched.slice(i, i + CHUNK_SIZE);
        res.write(`data: ${JSON.stringify({ type: 'live', logs: slice })}\n\n`);
      }
    } catch (err) {
      // dead connection — clean it up instead of letting it break subsequent clients
      console.error('SSE write failed, removing dead client:', err);
      removeClient(res);
    }
  }
}

export function getConnectedClientCount(): number {
  return clients.length; // useful for a health/debug endpoint
}
