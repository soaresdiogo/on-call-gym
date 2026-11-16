import type { FastifyInstance } from 'fastify';
import { GetOrder } from './application/get-order.js';
import { HandlePaymentWebhook } from './application/handle-payment-webhook.js';
import { ListProducts } from './application/list-products.js';
import { PlaceOrder } from './application/place-order.js';
import type { StoreConfig } from './infrastructure/config.js';
import { openDatabase, type Database } from './infrastructure/database.js';
import { HttpPaymentGateway } from './infrastructure/http-payment-gateway.js';
import { PgOrderRepository } from './infrastructure/pg-order-repository.js';
import { PgProductRepository } from './infrastructure/pg-product-repository.js';
import { PgShipmentRepository, PgWebhookInbox } from './infrastructure/pg-webhook-repositories.js';
import { RandomIdGenerator } from './infrastructure/random-id-generator.js';
import { TrafficMetrics } from './infrastructure/traffic-metrics.js';
import { createHttpServer } from './presentation/http-server.js';
import { registerOperationsRoutes } from './presentation/operations-routes.js';
import { registerStoreRoutes } from './presentation/store-routes.js';
import { registerUiRoutes } from './presentation/ui-routes.js';
import { registerWebhookRoutes } from './presentation/webhook-routes.js';

export interface StoreOptions {
  readonly config: StoreConfig;
  /** Where the embedded database keeps its files; omit for an in-memory database. */
  readonly databaseDirectory?: string;
  readonly logFile?: string;
}

export interface Store {
  readonly app: FastifyInstance;
  readonly database: Database;
  close(): Promise<void>;
}

/**
 * Composition root. The lab loads this file from each exercise workspace,
 * so keep the `buildStore` name and signature when you change the store.
 */
export async function buildStore(options: StoreOptions): Promise<Store> {
  const database = await openDatabase(options.databaseDirectory);
  const metrics = new TrafficMetrics();
  const app = createHttpServer(options.logFile ? { logFile: options.logFile } : {});
  const orders = new PgOrderRepository(database);
  const products = new PgProductRepository(database);
  const payments = new HttpPaymentGateway(options.config.paymentProviderUrl, { logger: app.log, metrics });

  registerOperationsRoutes(app, metrics);
  registerUiRoutes(app);
  registerStoreRoutes(app, {
    listProducts: new ListProducts(products),
    placeOrder: new PlaceOrder({ products, orders, payments, ids: new RandomIdGenerator() }),
    getOrder: new GetOrder(orders),
    metrics,
  });
  registerWebhookRoutes(
    app,
    new HandlePaymentWebhook(new PgWebhookInbox(database), orders, new PgShipmentRepository(database)),
    options.config.webhookSecret,
  );
  await app.ready();

  return {
    app,
    database,
    close: async () => {
      await app.close();
      await database.close();
    },
  };
}
