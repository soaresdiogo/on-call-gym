import { ValidationError } from './errors.js';
import { Money } from './money.js';

export type OrderStatus = 'pending' | 'paid' | 'payment_failed' | 'rejected';

export const MAX_QUANTITY_PER_LINE = 10;

export interface OrderLine {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: Money;
}

export interface Order {
  readonly id: string;
  readonly status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly total: Money;
  readonly createdAt: Date;
}

export function assertValidQuantity(quantity: number): void {
  if (Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY_PER_LINE) {
    return;
  }
  throw new ValidationError(`Quantity must be an integer between 1 and ${MAX_QUANTITY_PER_LINE}`);
}

export function orderTotal(lines: readonly OrderLine[]): Money {
  return lines.reduce((total, line) => total.add(line.unitPrice.times(line.quantity)), Money.zero());
}
