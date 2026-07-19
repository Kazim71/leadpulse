import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger, serializeError } from './lib/logger.js';
import { resolveOrg } from './middleware/resolveOrg.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { eventsRouter } from './modules/events/events.controller.js';
import { identifyRouter } from './modules/identify/identify.controller.js';

export const app = express();

// Trust the proxy Supabase/Render/Fly sit behind so req.ip reflects the
// real client rather than the load balancer.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ---------------------------------------------------------------------
// Middleware order matters and is load-bearing:
//   cors -> json body parser -> resolveOrg -> rateLimiter -> routes -> errors
// rateLimiter keys on visitor_id from the body, so it must come after the
// parser; it needs organizationId, so it must come after resolveOrg.
// ---------------------------------------------------------------------

app.use(
  cors({
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
    maxAge: 86_400,
  }),
);

// 100kb: event payloads are a URL plus a handful of products. Anything
// larger is a bug or an attack, and rejecting early keeps a malformed
// snippet from pushing megabytes through the parser.
app.use(express.json({ limit: '100kb' }));

// Unauthenticated, and mounted ahead of resolveOrg so uptime checks do not
// need an api_key or a database round-trip.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime_seconds: Math.round(process.uptime()) });
});

// Everything under /api is tenant-scoped and rate limited.
const api = express.Router();
api.use(resolveOrg);
api.use(rateLimiter);
api.use('/events', eventsRouter);
api.use('/identify', identifyRouter);
app.use('/api', api);

app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
const server = app.listen(env.PORT, () => {
  logger.info('leadpulse backend listening', {
    port: env.PORT,
    node_env: env.NODE_ENV,
  });
});

function shutdown(signal: string): void {
  logger.info('shutting down', { signal });
  server.close(() => process.exit(0));
  // Do not let a hung connection block the deploy indefinitely.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A rejected promise that escapes every handler means state is unknown.
// Log it and let the supervisor restart rather than continuing blind.
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection', serializeError(reason));
  process.exit(1);
});
