import type { Money } from './money.js';

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: Money;
  readonly stock: number;
}

export function isAvailable(product: Product): boolean {
  return product.stock > 0;
}
