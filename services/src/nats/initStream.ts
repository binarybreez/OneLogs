import { getNats } from '.';
import { RetentionPolicy, StorageType } from 'nats';

export async function initNatsStream() {
  const { nc } = await getNats();
  const jsm = await nc.jetstreamManager();
  await jsm.streams.add({
    name: 'OL_LOGS',
    subjects: ['logs.ingest'],
    retention: RetentionPolicy.Workqueue,
    storage: StorageType.File,
    max_age: 0,
    max_msgs: -1,
  });
  console.log('Jetstream stream OL_Logs Initialised');
}
