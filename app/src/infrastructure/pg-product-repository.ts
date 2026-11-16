import type { ProductRepository } from '../application/ports.js';
import { Money } from '../domain/money.js';
import type { Product } from '../domain/product.js';
import type { SqlClient } from './database.js';

interface ProductRow {
  id: string;
  name: string;
  price_cents: number;
  stock: number;
}

export class PgProductRepository implements ProductRepository {
  constructor(private readonly sql: SqlClient) {}

  async listAll(): Promise<Product[]> {
    const rows = await this.sql.query<ProductRow>('SELECT id, name, price_cents, stock FROM products ORDER BY name');
    return rows.map(toProduct);
  }

  async findByIds(ids: readonly string[]): Promise<Product[]> {
    const rows = await this.sql.query<ProductRow>(
      'SELECT id, name, price_cents, stock FROM products WHERE id = ANY($1::text[])',
      [ids],
    );
    return rows.map(toProduct);
  }

  async reserve(productId: string, quantity: number): Promise<boolean> {
    // Check and decrement in one statement so concurrent buyers cannot both win.
    const rows = await this.sql.query<{ id: string }>(
      'UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING id',
      [productId, quantity],
    );
    return rows.length === 1;
  }

  async release(productId: string, quantity: number): Promise<void> {
    await this.sql.query('UPDATE products SET stock = stock + $2 WHERE id = $1', [productId, quantity]);
  }
}

function toProduct(row: ProductRow): Product {
  return { id: row.id, name: row.name, price: Money.fromCents(row.price_cents), stock: row.stock };
}
