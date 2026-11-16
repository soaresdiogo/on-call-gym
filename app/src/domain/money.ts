import { ValidationError } from './errors.js';

/** Value object for amounts in integer cents, so no float rounding ever reaches a total. */
export class Money {
  private constructor(private readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new ValidationError(`Invalid amount in cents: ${cents}`);
    }
    return new Money(cents);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  times(quantity: number): Money {
    return Money.fromCents(this.cents * quantity);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toCents(): number {
    return this.cents;
  }
}
