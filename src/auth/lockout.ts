// 5 failures in 15 minutes per email and per IP -> 429 TOO_MANY_ATTEMPTS
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failuresByEmail = new Map<string, number[]>();
const failuresByIp = new Map<string, number[]>();

function cleanOld(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export function checkLockout(email: string, ip: string): boolean {
  const now = Date.now();
  const emailKey = email.toLowerCase().trim();
  const ipKey = ip.trim();

  const emailHits = cleanOld(failuresByEmail.get(emailKey) ?? [], now);
  failuresByEmail.set(emailKey, emailHits);
  if (emailHits.length >= MAX_FAILURES) return true;

  if (ipKey) {
    const ipHits = cleanOld(failuresByIp.get(ipKey) ?? [], now);
    failuresByIp.set(ipKey, ipHits);
    if (ipHits.length >= MAX_FAILURES) return true;
  }

  return false;
}

export function recordFailure(email: string, ip: string): void {
  const now = Date.now();
  const emailKey = email.toLowerCase().trim();
  const ipKey = ip.trim();

  const emailHits = cleanOld(failuresByEmail.get(emailKey) ?? [], now);
  emailHits.push(now);
  failuresByEmail.set(emailKey, emailHits);

  if (ipKey) {
    const ipHits = cleanOld(failuresByIp.get(ipKey) ?? [], now);
    ipHits.push(now);
    failuresByIp.set(ipKey, ipHits);
  }
}

export function resetFailures(email: string, ip: string): void {
  const emailKey = email.toLowerCase().trim();
  const ipKey = ip.trim();
  failuresByEmail.delete(emailKey);
  if (ipKey) failuresByIp.delete(ipKey);
}
