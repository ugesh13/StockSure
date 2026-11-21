// Tiny structured logger. One JSON object per line. Secrets are scrubbed by key name.

type Level = 'debug' | 'info' | 'warn' | 'error';

const SECRET_KEY = /staff_?key|admin_?token|api_?key|password|secret|authorization|cookie|database_url|opensearch_url|_b64|private/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? '[redacted]' : scrub(v, depth + 1);
  }
  return out;
}

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(scrub(fields) as object) });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

/** Error -> loggable fields. Never includes connection strings (pg/kafka messages do not contain them). */
export function errFields(e: unknown): Record<string, unknown> {
  if (e instanceof Error) {
    const code = (e as { code?: unknown }).code;
    return { error: e.message, ...(code !== undefined ? { code } : {}) };
  }
  return { error: String(e) };
}
