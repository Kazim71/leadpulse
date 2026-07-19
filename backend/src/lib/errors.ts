/**
 * Errors thrown anywhere below the controller layer. The error handler maps
 * these to HTTP responses; everything else becomes an opaque 500.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  /** Safe to serialize to the client. Never put raw DB output here. */
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'INVALID_PAYLOAD', message, details);

export const unauthorized = (message = 'Missing or invalid API key') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details);

export const tooManyRequests = (message = 'Rate limit exceeded', details?: unknown) =>
  new AppError(429, 'RATE_LIMITED', message, details);

export const internal = (message = 'Internal server error') =>
  new AppError(500, 'INTERNAL_ERROR', message);
