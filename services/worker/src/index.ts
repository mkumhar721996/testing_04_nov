import { Worker } from './worker.js';

const worker = new Worker(Number(process.env.WORKER_INTERVAL_MS ?? 1000));
worker.start();
console.log('comp_background_worker started');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    worker.stop();
    console.log(`comp_background_worker stopped (${signal})`);
  });
}
