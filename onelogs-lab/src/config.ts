import 'dotenv/config';
import * as path from 'path';

const flag = (v: string | undefined, fallback: boolean) =>
  v === undefined || v === ''
    ? fallback
    : ['1', 'true', 'yes'].includes(v.toLowerCase());

const dataDir = path.resolve(process.env.LAB_DATA_DIR ?? 'data');

export const config = {
  host: process.env.LAB_HOST ?? '127.0.0.1',
  port: Number(process.env.LAB_PORT ?? 4000),
  seed: Number(process.env.LAB_SEED ?? 1337),
  dataDir,
  logsDir: path.join(dataDir, 'logs'), // <- the ONLY directory a detector should read
  labelsDir: path.resolve(process.env.LAB_LABELS_DIR ?? 'ground_truth'), // <- ground truth, kept outside data/
  enforceOwnership: flag(process.env.LAB_ENFORCE_OWNERSHIP, false),
  allowSimTime: flag(process.env.LAB_ALLOW_SIM_TIME, true),
  simulateLatency: flag(process.env.LAB_SIMULATE_LATENCY, true),
  oneLog: {
    url: process.env.ONELOG_URL ?? 'http://localhost:8080/api',
    apiKey: process.env.ONELOG_API_KEY ?? '',
    appName: 'lab-shop',
    environment: 'lab',
  },
} as const;
