import { getNats } from '.';

export async function publishLogBatches(
  keyId: string,
  logs: any[],
  serverRecievedAt: number,
  user_id: string,
) {
  const { nc, jc } = await getNats();
  const js = nc.jetstream();
  await js.publish(
    'logs.ingest',
    jc.encode({
      keyId,
      user_id,
      logs,
      serverRecievedAt,
      timestamp: Date.now(),
    }),
  );
}
