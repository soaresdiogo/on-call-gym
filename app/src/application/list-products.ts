import { isAvailable } from '../domain/product.js';
import type { ProductRepository } from './ports.js';

export interface ProductView {
  readonly id: string;
  readonly name: string;
  readonly priceCents: number;
  readonly available: boolean;
}

export class ListProducts {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<ProductView[]> {
    const products = await this.products.listAll();
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.price.toCents(),
      available: isAvailable(product),
    }));
  }
}
