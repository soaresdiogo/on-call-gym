import type { CreateOrderResult, NewOrder, OrderRepository } from '../application/ports.js';
import { Money } from '../domain/money.js';
import type { Order, OrderLine, OrderStatus } from '../domain/order.js';
import type { Database, SqlClient } from './database.js';

interface OrderRow {
  id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: Date;
}

interface LineRow {
  product_id: string;
  quantity: number;
  unit_price_cents: number;
}

export class PgOrderRepository implements OrderRepository {
  constructor(private readonly database: Database) {}

  async create(order: NewOrder): Promise<CreateOrderResult> {
    const inserted = await this.database.transaction((client) => insertOrder(client, order));
    if (inserted) {
      return { kind: 'created', order: await this.require(order.id) };
    }
    return { kind: 'duplicate', order: await this.requireByKey(order.idempotencyKey) };
  }

  async findById(id: string): Promise<Order | null> {
    const rows = await this.database.query<OrderRow>(
      'SELECT id, status, total_cents, created_at FROM orders WHERE id = $1',
      [id],
    );
    return this.withLines(rows[0]);
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const rows = await this.database.query<OrderRow>(
      'SELECT id, status, total_cents, created_at FROM orders WHERE idempotency_key = $1',
      [key],
    );
    return this.withLines(rows[0]);
  }

  async updateStatus(id: string, status: OrderStatus, paymentId?: string): Promise<void> {
    await this.database.query('UPDATE orders SET status = $2, payment_id = COALESCE($3, payment_id) WHERE id = $1', [
      id,
      status,
      paymentId ?? null,
    ]);
  }

  private async withLines(row: OrderRow | undefined): Promise<Order | null> {
    if (!row) {
      return null;
    }
    const lines = await this.database.query<LineRow>(
      'SELECT product_id, quantity, unit_price_cents FROM order_lines WHERE order_id = $1 ORDER BY id',
      [row.id],
    );
    return toOrder(row, lines);
  }

  private async require(id: string): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error(`Order ${id} vanished right after it was created`);
    }
    return order;
  }

  private async requireByKey(key: string | null): Promise<Order> {
    const order = key ? await this.findByIdempotencyKey(key) : null;
    if (!order) {
      throw new Error('Idempotency conflict without a stored order');
    }
    return order;
  }
}

async function insertOrder(client: SqlClient, order: NewOrder): Promise<boolean> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO orders (id, status, total_cents, idempotency_key) VALUES ($1, 'pending', $2, $3)
     ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
    [order.id, order.total.toCents(), order.idempotencyKey],
  );
  if (rows.length === 0) {
    return false;
  }
  for (const line of order.lines) {
    await client.query(
      'INSERT INTO order_lines (order_id, product_id, quantity, unit_price_cents) VALUES ($1, $2, $3, $4)',
      [order.id, line.productId, line.quantity, line.unitPrice.toCents()],
    );
  }
  return true;
}

function toOrder(row: OrderRow, lines: readonly LineRow[]): Order {
  return {
    id: row.id,
    status: row.status,
    total: Money.fromCents(row.total_cents),
    createdAt: new Date(row.created_at),
    lines: lines.map(toLine),
  };
}

function toLine(row: LineRow): OrderLine {
  return { productId: row.product_id, quantity: row.quantity, unitPrice: Money.fromCents(row.unit_price_cents) };
}
