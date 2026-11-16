/** Base class for business errors; the HTTP layer maps each code to a status. */
export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
}

export type DomainErrorCode =
  | 'invalid_request'
  | 'not_found'
  | 'out_of_stock'
  | 'payment_declined'
  | 'payment_unavailable'
  | 'unauthorized';

export class ValidationError extends DomainError {
  readonly code = 'invalid_request';
}

export class NotFoundError extends DomainError {
  readonly code = 'not_found';
}

export class OutOfStockError extends DomainError {
  readonly code = 'out_of_stock';
}

export class PaymentDeclinedError extends DomainError {
  readonly code = 'payment_declined';
}

export class PaymentUnavailableError extends DomainError {
  readonly code = 'payment_unavailable';
}

export class UnauthorizedError extends DomainError {
  readonly code = 'unauthorized';
}
