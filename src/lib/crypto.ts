import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";

// OWASP-recommended argon2id parameters (19 MiB, t=2, p=1).
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}

/** Pre-computed hash used to equalise timing when a login targets a non-existent account. */
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

/** High-entropy opaque token for refresh/verification/reset flows. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Tokens are high-entropy, so a fast unsalted hash is sufficient for at-rest storage. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
