import { JSONCodec, connect, NatsConnection, Codec } from 'nats';

let natsConnection: NatsConnection | null = null;

const jc: Codec<unknown> = JSONCodec();

export async function getNats(): Promise<{
  nc: NatsConnection;
  jc: Codec<unknown>;
}> {
  if (!natsConnection) {
    natsConnection = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      name: 'onelogs',
      // user: process.env.NATS_USER || 'nats',
    });
    console.log('connected to Nats');
  }
  return { nc: natsConnection, jc };
}
