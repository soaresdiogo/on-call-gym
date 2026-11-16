import { loadConfig } from './infrastructure/config.js';
import { buildStore } from './store.js';

const DEFAULT_PORT = 4100;
// Lab services listen on loopback only; nothing here should be reachable from the network.
const HOST = '127.0.0.1';

const config = loadConfig(process.env);
const store = await buildStore({
  config,
  ...(process.env.DATABASE_DIR ? { databaseDirectory: process.env.DATABASE_DIR } : {}),
});
await store.app.listen({ host: HOST, port: Number(process.env.PORT ?? DEFAULT_PORT) });
console.log(`Store listening on http://${HOST}:${process.env.PORT ?? DEFAULT_PORT}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void store.close().then(() => process.exit(0)));
}
