import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/client.js";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  ver: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  if (
    typeof decoded !== "object" ||
    typeof decoded.sub !== "string" ||
    typeof decoded["role"] !== "string" ||
    typeof decoded["ver"] !== "number"
  ) {
    throw new jwt.JsonWebTokenError("invalid payload");
  }
  return { sub: decoded.sub, role: decoded["role"] as Role, ver: decoded["ver"] };
}
