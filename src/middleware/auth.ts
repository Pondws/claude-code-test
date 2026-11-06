import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import type { Role } from "../generated/prisma/client.js";

/**
 * Verifies the Bearer access token and confirms the user still exists and the
 * token has not been invalidated (password change / logout-all bump tokenVersion).
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing access token", "TOKEN_MISSING");
  }

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7).trim());
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized("Access token expired", "TOKEN_EXPIRED");
    }
    throw AppError.unauthorized("Invalid access token", "TOKEN_INVALID");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, tokenVersion: true },
  });
  if (!user || user.tokenVersion !== payload.ver) {
    throw AppError.unauthorized("Invalid access token", "TOKEN_INVALID");
  }

  req.auth = { userId: user.id, role: user.role };
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw AppError.unauthorized();
    if (!roles.includes(req.auth.role)) throw AppError.forbidden();
    next();
  };
}
