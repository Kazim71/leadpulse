import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const threshold = LEVEL_ORDER[env.LOG_LEVEL];

export interface LogContext {
  org_id?: string;
  visitor_id?: string;
  request_id?: string;
  [key: string]: unknown;
}

function emit(level: Level, message: string, context: LogContext = {}): void {
  if (LEVEL_ORDER[level] < threshold) return;

  // Context is spread FIRST so the core fields always win. Spreading it
  // last lets any caller passing a `message` key silently overwrite the log
  // message — and `level`/`timestamp` along with it.
  const line = JSON.stringify({
    ...context,
    level,
    timestamp: new Date().toISOString(),
    message,
  });

  // One JSON object per line — parseable by any log shipper without a
  // custom grok pattern. stderr for warn/error so container runtimes and
  // process managers route them separately.
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};

/**
 * Normalizes an unknown thrown value into something loggable. Stack traces
 * go here and nowhere near an HTTP response body.
 */
export function serializeError(err: unknown): Record<string, unknown> {
  // Keys are prefixed rather than named `message`/`name`: these get spread
  // into a log context where `message` is a reserved core field.
  if (err instanceof Error) {
    return { error_name: err.name, error_message: err.message, stack: err.stack };
  }

  // Supabase returns PostgrestError as a plain object, not an Error. Without
  // this branch String(err) yields "[object Object]" and the message, hint
  // and details — the only useful part — are lost.
  if (err !== null && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    return {
      error_name: typeof e.name === 'string' ? e.name : 'ObjectError',
      error_message:
        typeof e.message === 'string' ? e.message : safeStringify(err),
      ...(e.code !== undefined ? { error_code: e.code } : {}),
      ...(e.details !== undefined ? { error_details: e.details } : {}),
      ...(e.hint !== undefined ? { error_hint: e.hint } : {}),
    };
  }

  return { error_name: 'UnknownError', error_message: String(err) };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    // Circular reference, or a BigInt.
    return String(value);
  }
}
