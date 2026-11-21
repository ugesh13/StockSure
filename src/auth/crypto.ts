import crypto from 'node:crypto';

const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;

// Precomputed dummy scrypt hash for constant-time comparison when email is unknown
export const DUMMY_HASH = 'scrypt$16384$8$1$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LEN, { N, r, p }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return `scrypt$${N}$${r}$${p}$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const costN = parseInt(parts[1]!, 10);
    const costR = parseInt(parts[2]!, 10);
    const costP = parseInt(parts[3]!, 10);
    const salt = parts[4]!;
    const originalHash = Buffer.from(parts[5]!, 'hex');

    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, originalHash.length, { N: costN, r: costR, p: costP }, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    if (derived.length !== originalHash.length) return false;
    return crypto.timingSafeEqual(derived, originalHash);
  } catch {
    return false;
  }
}
