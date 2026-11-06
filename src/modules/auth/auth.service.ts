import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { generateToken, getDummyHash, hashPassword, hashToken, needsRehash, verifyPassword } from "../../lib/crypto.js";
import { signAccessToken } from "../../lib/jwt.js";
import { logger } from "../../lib/logger.js";
import { sendMailInBackground } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { TokenType, type User } from "../../generated/prisma/client.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import * as emails from "./auth.emails.js";

export interface ClientMeta {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export interface Session {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export type PublicUser = ReturnType<typeof toPublicUser>;

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

async function issueSession(user: User, meta: ClientMeta, familyId: string = randomUUID()): Promise<Session> {
  const refreshToken = generateToken();
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: meta.ip?.slice(0, 64) ?? null,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
    },
  });

  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, ver: user.tokenVersion }),
    accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

async function revokeFamily(familyId: string) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Registration & login
// ---------------------------------------------------------------------------

export async function register(input: RegisterInput, meta: ClientMeta) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name ?? null,
      passwordHash: await hashPassword(input.password),
    },
  });

  await sendVerificationEmail(user);
  const session = await issueSession(user, meta);
  logger.info({ userId: user.id }, "User registered");
  return { user: toPublicUser(user), session };
}

export async function login(input: LoginInput, meta: ClientMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    // Burn the same CPU as a real check so response time doesn't reveal whether the account exists.
    await verifyPassword(await getDummyHash(), input.password);
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw AppError.locked("Too many failed login attempts. Try again later.");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lock = attempts >= env.MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + env.LOCKOUT_MINUTES * 60_000) : user.lockedUntil,
      },
    });
    if (lock) logger.warn({ userId: user.id, ip: meta.ip }, "Account locked after repeated failed logins");
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      // Transparently upgrade hashes when argon2 parameters change.
      ...(needsRehash(user.passwordHash) ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });

  const session = await issueSession(updated, meta);
  logger.info({ userId: user.id, ip: meta.ip }, "User logged in");
  return { user: toPublicUser(updated), session };
}

// ---------------------------------------------------------------------------
// Refresh-token rotation with reuse detection
// ---------------------------------------------------------------------------

export async function refresh(rawToken: string | undefined, meta: ClientMeta) {
  if (!rawToken) throw AppError.unauthorized("Missing refresh token", "REFRESH_TOKEN_MISSING");

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!stored) throw AppError.unauthorized("Invalid refresh token", "REFRESH_TOKEN_INVALID");

  if (stored.revokedAt) {
    // A rotated-out token was presented again: assume theft and kill the whole session chain.
    await revokeFamily(stored.familyId);
    logger.warn({ userId: stored.userId, familyId: stored.familyId, ip: meta.ip }, "Refresh token reuse detected");
    throw AppError.unauthorized("Invalid refresh token", "REFRESH_TOKEN_REUSED");
  }

  if (stored.expiresAt <= new Date()) {
    throw AppError.unauthorized("Refresh token expired", "REFRESH_TOKEN_EXPIRED");
  }

  // Conditional update guards against two concurrent requests both rotating the same token.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    await revokeFamily(stored.familyId);
    logger.warn({ userId: stored.userId, familyId: stored.familyId }, "Concurrent refresh token reuse detected");
    throw AppError.unauthorized("Invalid refresh token", "REFRESH_TOKEN_REUSED");
  }

  const session = await issueSession(stored.user, meta, stored.familyId);
  return { user: toPublicUser(stored.user), session };
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return;
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { familyId: true },
  });
  if (stored) await revokeFamily(stored.familyId);
}

export async function logoutAll(userId: string) {
  await prisma.$transaction([
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
  ]);
  logger.info({ userId }, "All sessions revoked");
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  return toPublicUser(user);
}

// ---------------------------------------------------------------------------
// One-time tokens (email verification, password reset)
// ---------------------------------------------------------------------------

async function createOneTimeToken(userId: string, type: TokenType, ttlMs: number) {
  const token = generateToken();
  await prisma.$transaction([
    // Only the most recently issued token of each type stays valid.
    prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.verificationToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return token;
}

/** Atomically consumes a one-time token, returning its userId, or throws if invalid/expired/used. */
async function consumeOneTimeToken(rawToken: string, type: TokenType) {
  const now = new Date();
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt <= now) {
    throw AppError.badRequest("Invalid or expired token", "TOKEN_INVALID");
  }
  const { count } = await prisma.verificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: now },
  });
  if (count === 0) throw AppError.badRequest("Invalid or expired token", "TOKEN_INVALID");
  return record.userId;
}

async function sendVerificationEmail(user: User) {
  const token = await createOneTimeToken(user.id, TokenType.EMAIL_VERIFICATION, env.EMAIL_VERIFICATION_TTL_HOURS * 3600_000);
  sendMailInBackground(emails.verifyEmail(user.email, token));
}

export async function resendVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  if (user.emailVerifiedAt) throw AppError.badRequest("Email is already verified", "EMAIL_ALREADY_VERIFIED");
  await sendVerificationEmail(user);
}

export async function verifyEmail(rawToken: string) {
  const userId = await consumeOneTimeToken(rawToken, TokenType.EMAIL_VERIFICATION);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
  logger.info({ userId }, "Email verified");
  return toPublicUser(user);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Respond identically whether or not the account exists.
  if (!user) return;
  const token = await createOneTimeToken(user.id, TokenType.PASSWORD_RESET, env.PASSWORD_RESET_TTL_MINUTES * 60_000);
  sendMailInBackground(emails.resetPassword(user.email, token));
  logger.info({ userId: user.id }, "Password reset requested");
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const userId = await consumeOneTimeToken(rawToken, TokenType.PASSWORD_RESET);
  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    // Receiving the reset link proves control of the mailbox.
    prisma.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: now } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.verificationToken.updateMany({
      where: { userId, type: TokenType.PASSWORD_RESET, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  sendMailInBackground(emails.passwordChanged(user.email));
  logger.info({ userId }, "Password reset completed");
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, meta: ClientMeta) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw AppError.badRequest("Current password is incorrect", "INVALID_CURRENT_PASSWORD");
  }

  const passwordHash = await hashPassword(newPassword);
  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  sendMailInBackground(emails.passwordChanged(updated.email));
  logger.info({ userId }, "Password changed");
  // Other sessions are signed out; keep the current client signed in with a fresh session.
  return issueSession(updated, meta);
}
