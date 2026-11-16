/** The slice of a pino logger the store uses; Fastify's request and app loggers both fit. */
export interface Logger {
  info(details: object, message: string): void;
  warn(details: object, message: string): void;
  error(details: object, message: string): void;
}
