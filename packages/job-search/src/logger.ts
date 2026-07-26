/**
 * Minimal structured logger. One JSON object per line so logs stay greppable
 * locally and parseable by an aggregator in production.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

export interface StructuredLogger {
  log(level: LogLevel, event: string, fields?: LogFields): void;
}

function write(scope: string, level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    event,
    ...fields,
  });

  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

export function createLogger(scope: string): StructuredLogger {
  return {
    log: (level, event, fields) => write(scope, level, event, fields),
  };
}

export const noopLogger: StructuredLogger = { log: () => undefined };
