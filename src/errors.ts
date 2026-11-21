/** Error with an HTTP status and a stable code. Rendered as { error: { code, message, details } }. */
export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Same as `status`. Lets callers that check Fastify-style `statusCode` read it too. */
  get statusCode(): number {
    return this.status;
  }
}

export const notFound = (what: string): AppError => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const badInput = (message: string, details?: unknown): AppError => new AppError(400, 'BAD_INPUT', message, details);
