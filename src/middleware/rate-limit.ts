import { rateLimit, type Options } from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * NOTE: the default in-memory store is per-process. When running more than one
 * instance, plug in a shared store (e.g. rate-limit-redis) via the `store` option.
 */
function limiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.RATE_LIMIT_DISABLED,
    handler: (_req, res, _next, opts) => {
      res.status(opts.statusCode).json({
        error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" },
      });
    },
    ...options,
  });
}

/** Broad limit applied to all API traffic. */
export const globalLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 300 });

/** Credential-handling endpoints (login, register, password reset). */
export const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 20 });

/** Refresh is called routinely by clients, so it gets a looser limit. */
export const refreshLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 100 });
