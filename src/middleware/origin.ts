import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

/**
 * CSRF defence-in-depth for endpoints authenticated by the refresh cookie.
 *
 * SameSite=Strict already stops cross-*site* requests, but a sibling subdomain
 * (e.g. a compromised `blog.example.com`) counts as same-site. Browsers always
 * send `Origin` on cross-origin POSTs, so any request that carries one must
 * come from an allowed frontend. Requests without `Origin` (non-browser
 * clients, same-origin navigations in old browsers) are let through; they
 * cannot be forged by a third-party page.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get("origin");
  if (origin !== undefined && !env.CORS_ORIGINS.includes(origin)) {
    throw AppError.forbidden("Request origin is not allowed", "ORIGIN_NOT_ALLOWED");
  }
  next();
};
