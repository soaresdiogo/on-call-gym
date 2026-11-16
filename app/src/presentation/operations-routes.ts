import type { FastifyInstance } from 'fastify';
import type { TrafficMetrics } from '../infrastructure/traffic-metrics.js';

export function registerOperationsRoutes(app: FastifyInstance, metrics: TrafficMetrics): void {
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async () => ({ status: 'ready' }));
  app.get('/metrics', async () => metrics.snapshot());
}
