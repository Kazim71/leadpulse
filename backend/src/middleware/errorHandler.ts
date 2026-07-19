import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';
import { logger, serializeError } from '../lib/logger.js';

/** 404 for anything that fell through the router. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` },
  });
}

/**
 * Terminal error middleware. Every response body in this app that is not a
 * success goes through here, so the shape stays consistent:
 *   { error: { code, message, details? } }
 *
 * Stack traces are logged, never serialized. An unrecognized error is
 * reported to the client as a bare 500 — the real message may contain
 * connection strings, row contents, or SQL.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const orgId = req.organizationId;

  if (err instanceof AppError) {
    // Client errors are expected traffic, not incidents — log at warn.
    logger.warn('request rejected', {
      org_id: orgId,
      path: req.path,
      status: err.status,
      code: err.code,
      error_message: err.message,
    });

    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // express.json() rejects oversized or malformed bodies before any of our
  // code runs. Translate those into our envelope rather than letting
  // Express emit its default HTML error page.
  const maybeBodyParserError = err as { type?: string; status?: number };
  if (maybeBodyParserError?.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the size limit' },
    });
    return;
  }
  if (maybeBodyParserError?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
    });
    return;
  }

  logger.error('unhandled error', {
    org_id: orgId,
    path: req.path,
    ...serializeError(err),
  });

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
