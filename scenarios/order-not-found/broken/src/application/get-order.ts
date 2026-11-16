import type { Order } from '../domain/order.js';
import type { OrderRepository } from './ports.js';

export interface OrderView {
  readonly id: string;
  readonly status: Order['status'];
  readonly totalCents: number;
  readonly createdAt: string;
  readonly lines: readonly { productId: string; quantity: number; unitPriceCents: number }[];
}

export class GetOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(orderId: string): Promise<OrderView> {
    const order = await this.orders.findById(orderId);
    return toView(order as Order);
  }
}

function toView(order: Order): OrderView {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.total.toCents(),
    createdAt: order.createdAt.toISOString(),
    lines: order.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPriceCents: line.unitPrice.toCents(),
    })),
  };
}
