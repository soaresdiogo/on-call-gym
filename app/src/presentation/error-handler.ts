import type { FastifyError, FastifyInstance } from 'fastify';
import { DomainError, type DomainErrorCode } from '../domain/errors.js';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  payment_declined: 402,
  not_found: 404,
  out_of_stock: 409,
  payment_unavailable: 503,
};

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;

/** Clients get a stable code and message, never a stack trace. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(STATUS_BY_CODE[error.code]).send({ error: error.code, message: error.message });
    }
    if (error.validation || error.statusCode === HTTP_BAD_REQUEST) {
      return reply.status(HTTP_BAD_REQUEST).send({ error: 'invalid_request', message: 'The request is not valid' });
    }
    request.log.error({ err: error }, 'unhandled error');
    return reply.status(HTTP_INTERNAL_ERROR).send({ error: 'internal_error', message: 'Something went wrong' });
  });
}
