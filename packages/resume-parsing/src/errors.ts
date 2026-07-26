/**
 * Failure taxonomy for resume parsing.
 *
 * Classifying failures is what makes them observable: "fetch failed" tells nobody
 * anything, while `ai_unreachable` tells an operator the service is down and tells
 * the user to start it. The `retryable` flag drives queue retry behaviour.
 */
export type ParseFailureKind =
  | 'ai_unreachable'
  | 'ai_timeout'
  | 'ai_rejected_file'
  | 'ai_error'
  | 'storage_missing'
  | 'resume_missing'
  | 'invalid_ai_response'
  | 'unknown';

const RETRYABLE: ReadonlySet<ParseFailureKind> = new Set<ParseFailureKind>([
  'ai_unreachable',
  'ai_timeout',
  'ai_error',
]);

export class ResumeParseError extends Error {
  readonly kind: ParseFailureKind;
  readonly retryable: boolean;

  constructor(kind: ParseFailureKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ResumeParseError';
    this.kind = kind;
    this.retryable = RETRYABLE.has(kind);
  }
}

/** Node hides socket-level failures behind a generic "fetch failed" TypeError. */
function causeCode(error: unknown): string | undefined {
  const cause = (error as { cause?: unknown } | null)?.cause;
  const code = (cause as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

const UNREACHABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
]);

/** Translate an arbitrary thrown value into a classified, user-facing failure. */
export function classifyParseError(error: unknown, aiServiceUrl: string): ResumeParseError {
  if (error instanceof ResumeParseError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return new ResumeParseError(
        'ai_timeout',
        `The AI service at ${aiServiceUrl} did not respond in time.`,
        { cause: error },
      );
    }

    const code = causeCode(error);
    if ((code && UNREACHABLE_CODES.has(code)) || error.message === 'fetch failed') {
      return new ResumeParseError(
        'ai_unreachable',
        `Could not reach the AI service at ${aiServiceUrl}. Start it with "pnpm dev:ai" (or "pnpm dev" to run everything), then retry.`,
        { cause: error },
      );
    }

    if (error.message === 'Object not found') {
      return new ResumeParseError(
        'storage_missing',
        'The stored resume file is missing. Re-upload the file to parse it again.',
        { cause: error },
      );
    }

    return new ResumeParseError('unknown', error.message, { cause: error });
  }

  return new ResumeParseError('unknown', 'Resume parse failed');
}
