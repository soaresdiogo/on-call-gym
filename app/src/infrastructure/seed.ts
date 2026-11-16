import type { SqlClient } from './database.js';

/** Fictional catalog; every exercise starts from these rows. */
export const CATALOG_SEED = [
  { id: 'p-espresso', name: 'Espresso Beans 1kg', priceCents: 1899, stock: 100_000 },
  { id: 'p-grinder', name: 'Burr Grinder', priceCents: 8990, stock: 500 },
  { id: 'p-mug', name: 'Café Mug', priceCents: 1299, stock: 1_000 },
  { id: 'p-kettle', name: 'Gooseneck Kettle', priceCents: 4590, stock: 200 },
  { id: 'p-filters', name: 'Paper Filters (100)', priceCents: 499, stock: 5_000 },
  { id: 'p-scale', name: 'Brewing Scale', priceCents: 2990, stock: 50 },
] as const;

export async function seedCatalog(client: SqlClient): Promise<void> {
  for (const product of CATALOG_SEED) {
    await client.query(
      `INSERT INTO products (id, name, price_cents, stock) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [product.id, product.name, product.priceCents, product.stock],
    );
  }
}
