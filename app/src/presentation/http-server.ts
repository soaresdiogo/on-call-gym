import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerErrorHandler } from './error-handler.js';
import { registerSecurityHeaders } from './security-headers.js';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_CORRELATION_ID_LENGTH = 100;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export interface HttpServerOptions {
  /** Structured JSON logs go to this file; without it the server is silent. */
  readonly logFile?: string;
}

export function createHttpServer(options: HttpServerOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logFile ? { level: 'info', file: options.logFile } : false,
    bodyLimit: MAX_BODY_BYTES,
    genReqId: (request) => correlationIdFrom(request.headers['x-correlation-id']),
  });
  registerSecurityHeaders(app);
  registerErrorHandler(app);
  return app;
}

/** Reuses the caller's correlation id when it is safe to log, so one id follows a request across services. */
function correlationIdFrom(header: string | string[] | undefined): string {
  const candidate = Array.isArray(header) ? header[0] : header;
  if (candidate && candidate.length <= MAX_CORRELATION_ID_LENGTH && CORRELATION_ID_PATTERN.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}
