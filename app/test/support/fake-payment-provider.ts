import Fastify, { type FastifyInstance } from 'fastify';

/** Minimal provider for the store's own tests: always answers with the configured status. */
export async function startFakeProvider(status = 201): Promise<{ url: string; calls: () => number; close: () => Promise<void> }> {
  let calls = 0;
  const server: FastifyInstance = Fastify({ logger: false });
  server.post('/charges', async (_request, reply) => {
    calls += 1;
    return reply.status(status).send(status === 201 ? { paymentId: `pay_${calls}` } : { error: 'fake' });
  });
  const url = await server.listen({ host: '127.0.0.1', port: 0 });
  return { url, calls: () => calls, close: () => server.close() };
}
