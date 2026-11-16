import { describe, expect, it } from 'vitest';
import { ValidationError } from '../src/domain/errors.js';
import { Money } from '../src/domain/money.js';
import { orderTotal } from '../src/domain/order.js';

describe('Money', () => {
  it('adds and multiplies in integer cents', () => {
    // Arrange
    const price = Money.fromCents(1299);

    // Act
    const total = price.times(3).add(Money.fromCents(1));

    // Assert
    expect(total.toCents()).toBe(3898);
  });

  it('rejects fractional or negative cents', () => {
    expect(() => Money.fromCents(10.5)).toThrow(ValidationError);
    expect(() => Money.fromCents(-1)).toThrow(ValidationError);
  });

  it('totals order lines', () => {
    // Arrange
    const lines = [
      { productId: 'a', quantity: 2, unitPrice: Money.fromCents(499) },
      { productId: 'b', quantity: 1, unitPrice: Money.fromCents(8990) },
    ];

    // Act
    const total = orderTotal(lines);

    // Assert
    expect(total.toCents()).toBe(9988);
  });
});
