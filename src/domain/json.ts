/**
 * Parse a JSON request body. An empty body is allowed (returns undefined): browsers and fetch helpers often send
 * "Content-Type: application/json" on POST /pay, POST /cancel and DELETE even when there is nothing to send,
 * and Fastify's built-in parser answers those with a 400.
 */
export function parseJsonBody(raw: string): unknown {
  if (raw.trim() === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Body is not valid JSON'), { statusCode: 400 });
  }
}
