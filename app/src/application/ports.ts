import type { Money } from '../domain/money.js';
import type { Order, OrderLine, OrderStatus } from '../domain/order.js';
import type { Product } from '../domain/product.js';

export interface ProductRepository {
  listAll(): Promise<Product[]>;
  findByIds(ids: readonly string[]): Promise<Product[]>;
  /** Atomically takes `quantity` units; false when there is not enough stock. */
  reserve(productId: string, quantity: number): Promise<boolean>;
  release(productId: string, quantity: number): Promise<void>;
}

export interface NewOrder {
  readonly id: string;
  readonly lines: readonly OrderLine[];
  readonly total: Money;
  readonly idempotencyKey: string | null;
}

export type CreateOrderResult = { kind: 'created'; order: Order } | { kind: 'duplicate'; order: Order };

export interface OrderRepository {
  create(order: NewOrder): Promise<CreateOrderResult>;
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  updateStatus(id: string, status: OrderStatus, paymentId?: string): Promise<void>;
}

export interface ChargeRequest {
  readonly orderId: string;
  readonly amount: Money;
  readonly correlationId: string;
}

export interface ChargeReceipt {
  readonly paymentId: string;
}

export interface PaymentGateway {
  /** Throws PaymentDeclinedError or PaymentUnavailableError. */
  charge(request: ChargeRequest): Promise<ChargeReceipt>;
}

export interface WebhookInbox {
  /** Records the event id; false when it was already recorded. */
  claim(eventId: string): Promise<boolean>;
  forget(eventId: string): Promise<void>;
}

export interface ShipmentRepository {
  create(orderId: string): Promise<void>;
}

export interface IdGenerator {
  next(): string;
}
