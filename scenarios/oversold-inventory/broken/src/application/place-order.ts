import { OutOfStockError, PaymentDeclinedError, PaymentUnavailableError, ValidationError } from '../domain/errors.js';
import { assertValidQuantity, orderTotal, type Order, type OrderLine } from '../domain/order.js';
import type { Product } from '../domain/product.js';
import type { IdGenerator, OrderRepository, PaymentGateway, ProductRepository } from './ports.js';

export interface PlaceOrderInput {
  readonly items: readonly { productId: string; quantity: number }[];
  readonly idempotencyKey: string | null;
  readonly correlationId: string;
}

export interface PlaceOrderOutput {
  readonly orderId: string;
  readonly status: Order['status'];
  readonly totalCents: number;
  readonly replayed: boolean;
}

export interface PlaceOrderDependencies {
  readonly products: ProductRepository;
  readonly orders: OrderRepository;
  readonly payments: PaymentGateway;
  readonly ids: IdGenerator;
}

/** Checkout use case: idempotent order creation, payment, then stock. */
export class PlaceOrder {
  constructor(private readonly dependencies: PlaceOrderDependencies) {}

  async execute(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    const previous = await this.findPrevious(input.idempotencyKey);
    if (previous) {
      return toOutput(previous, true);
    }
    const lines = await this.priceLines(input.items);
    const result = await this.dependencies.orders.create({
      id: this.dependencies.ids.next(),
      lines,
      total: orderTotal(lines),
      idempotencyKey: input.idempotencyKey,
    });
    if (result.kind === 'duplicate') {
      return toOutput(result.order, true);
    }
    // Stock is only taken once the payment went through, so failed payments never hold units.
    const output = await this.charge(result.order, input.correlationId);
    await this.takeStock(result.order.lines);
    return output;
  }

  private async findPrevious(idempotencyKey: string | null): Promise<Order | null> {
    if (!idempotencyKey) {
      return null;
    }
    return this.dependencies.orders.findByIdempotencyKey(idempotencyKey);
  }

  private async priceLines(items: PlaceOrderInput['items']): Promise<OrderLine[]> {
    if (items.length === 0) {
      throw new ValidationError('The cart is empty');
    }
    items.forEach((item) => assertValidQuantity(item.quantity));
    const products = await this.dependencies.products.findByIds(items.map((item) => item.productId));
    return items.map((item) => toLine(item, products));
  }

  private async takeStock(lines: readonly OrderLine[]): Promise<void> {
    for (const line of lines) {
      await this.dependencies.products.reserve(line.productId, line.quantity);
    }
  }

  private async charge(order: Order, correlationId: string): Promise<PlaceOrderOutput> {
    try {
      const receipt = await this.dependencies.payments.charge({ orderId: order.id, amount: order.total, correlationId });
      await this.dependencies.orders.updateStatus(order.id, 'paid', receipt.paymentId);
      return { orderId: order.id, status: 'paid', totalCents: order.total.toCents(), replayed: false };
    } catch (error) {
      await this.compensateFailedPayment(order, error);
      throw error;
    }
  }

  private async compensateFailedPayment(order: Order, error: unknown): Promise<void> {
    if (!(error instanceof PaymentDeclinedError || error instanceof PaymentUnavailableError)) {
      return;
    }
    await this.dependencies.orders.updateStatus(order.id, 'payment_failed');
  }
}

function toLine(item: { productId: string; quantity: number }, products: readonly Product[]): OrderLine {
  const product = products.find((candidate) => candidate.id === item.productId);
  if (!product) {
    throw new ValidationError(`Unknown product ${item.productId}`);
  }
  if (product.stock < item.quantity) {
    throw new OutOfStockError(`Product ${item.productId} is out of stock`);
  }
  return { productId: product.id, quantity: item.quantity, unitPrice: product.price };
}

function toOutput(order: Order, replayed: boolean): PlaceOrderOutput {
  return { orderId: order.id, status: order.status, totalCents: order.total.toCents(), replayed };
}
